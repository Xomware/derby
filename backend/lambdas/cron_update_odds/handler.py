"""Cron — refreshes live tote odds + jockey/trainer/post for Derby + Oaks.

Pulls from the JSON feed that powers TwinSpires' embedded race-entry widget:
  https://tscom-content.netlify.app/race-entry/{config_id}.json

config_id 650 = Kentucky Derby, 651 = Kentucky Oaks. The feed gives us:
  - HorseName, Jockey, Trainer, ProgramNumber (post position)
  - mtp.TextOdds — the live (current) tote line, e.g. "  5", "9/2", "50/1"
  - mtp.TextOdds == "SCR" when the horse is scratched

For each event in CURRENT_YEAR:
  1. If race-results already has finishers for the main race → skip.
  2. Fetch the JSON feed.
  3. For each pick whose horse_name matches a feed entry (case-insensitive),
     update odds_at_pick / jockey / trainer / post_position. Apply or clear
     `scratched` based on whichever side TwinSpires shows.

Failure-tolerant: if the feed is unreachable or malformed, log a warning and
let the next cron tick try again. Admins can override values manually via
/admin-results/odds, but the cron will overwrite them next run — disable the
EventBridge rule (`odds_cron_enabled=false`) if you need overrides sticky.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone

import requests
from boto3.dynamodb.conditions import Key

import json
import uuid

import boto3

from lambdas.common.constants import APP_NAME, AWS_DEFAULT_REGION
from lambdas.common.dynamo_helpers import (
    picks_table,
    poll_runs_table,
    query_all,
    race_results_table,
)
from lambdas.common.errors import handle_errors
from lambdas.common.logger import get_logger
from lambdas.common.utility_helpers import iso_now

HANDLER = "cron_update_odds"
log = get_logger(__name__)

CURRENT_YEAR = int(os.environ.get("ODDS_CRON_YEAR", "2026"))
PICKS_EVENT_INDEX = "event-index"

# Safety net: even if admin never enters official results, the cron stops
# firing after this UTC timestamp. 2026-05-02 8:00 PM ET == 2026-05-03
# 00:00 UTC.
SAFE_KILL_AT = os.environ.get("ODDS_CRON_KILL_AT", "2026-05-03T00:00:00+00:00")

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0 Safari/537.36 SunGodDerbyBot"
)

ENTRY_FEED_URL = "https://tscom-content.netlify.app/race-entry/{config_id}.json"

# TwinSpires widget config IDs for the 2026 races. The "Saturday/Friday"
# race-day feeds (672/732) carry the latest scratches and match what
# kentuckyderby.com displays; the older "Advance" feeds (650/651) lag.
TWINSPIRES_CONFIG_IDS: dict[str, int] = {
    "derby": int(os.environ.get("ODDS_DERBY_CONFIG_ID", "672")),
    "oaks": int(os.environ.get("ODDS_OAKS_CONFIG_ID", "732")),
}

ODDS_FRACTION_RE = re.compile(r"^(\d{1,3})\s*[-/]\s*(\d{1,3})$")


def _normalize(name: str) -> str:
    return name.strip().lower().replace("’", "'")


def _normalize_odds(raw: str | None) -> str | None:
    """TwinSpires odds tokens → our canonical 'N-D' string.

    Examples:
        '  5'   -> '5-1'
        '9/2'   -> '9-2'
        '50/1'  -> '50-1'
        '5-1'   -> '5-1'
        'SCR'   -> None (caller handles scratch via _is_scratched)
        ''      -> None
    """
    if raw is None:
        return None
    s = str(raw).strip()
    if not s or s.upper() == "SCR":
        return None
    m = ODDS_FRACTION_RE.match(s)
    if m:
        return f"{int(m.group(1))}-{int(m.group(2))}"
    # Bare integer like "5" or decimal like "5.0" (against $1).
    try:
        n = float(s)
    except ValueError:
        return None
    if n <= 0:
        return None
    return f"{int(n)}-1" if n.is_integer() else f"{n:g}-1"


def _is_scratched_entry(entry: dict) -> bool:
    text = (entry.get("mtp") or {}).get("TextOdds")
    if isinstance(text, str) and text.strip().upper() == "SCR":
        return True
    num = (entry.get("mtp") or {}).get("NumOdds")
    try:
        if num is not None and float(num) < 0:
            return True
    except (TypeError, ValueError):
        pass
    return False


def _race_is_over(event_id: str, race_number: int) -> bool:
    rows = query_all(
        race_results_table,
        KeyConditionExpression=Key("event_id").eq(event_id) & Key("race_number").eq(race_number),
    )
    if not rows:
        return False
    finishers = rows[0].get("finishers") or []
    return len(finishers) > 0


def _picks_for_event(event_id: str) -> list[dict]:
    return query_all(
        picks_table,
        IndexName=PICKS_EVENT_INDEX,
        KeyConditionExpression=Key("event_id").eq(event_id),
    )


def _fetch_twinspires(kind: str) -> dict[str, dict]:
    """Hit the TwinSpires entry JSON and return a normalized map keyed by
    lowercase horse name. Each value is one of:

        {"scratched": True, "post_position": "6"}
        {"odds": "5-1", "jockey": "...", "trainer": "...", "post_position": "1"}
    """
    config_id = TWINSPIRES_CONFIG_IDS[kind]
    url = ENTRY_FEED_URL.format(config_id=config_id)
    out: dict[str, dict] = {}
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
        payload = resp.json()
    except Exception as exc:
        log.warning(
            "odds_feed_fetch_failed",
            extra={"url": url, "kind": kind, "error": str(exc)},
        )
        return out

    for entry in payload.get("raceData") or []:
        name = (entry.get("HorseName") or "").strip()
        if not name:
            continue
        key = _normalize(name)
        post = (entry.get("ProgramNumber") or "").strip() or None

        if _is_scratched_entry(entry):
            out[key] = {"scratched": True, "post_position": post, "name": name}
            continue

        # Pick the right odds source. The tote saturates around 99 — when
        # NumOdds hits the ceiling, TextOdds reads "99" but the actual price
        # could be anywhere from 50-1 to 300-1, and ML is the cleaner display
        # in that case. Otherwise prefer live tote, falling back to ML.
        mtp = entry.get("mtp") or {}
        text_odds = mtp.get("TextOdds")
        try:
            num_odds = float(mtp.get("NumOdds")) if mtp.get("NumOdds") is not None else None
        except (TypeError, ValueError):
            num_odds = None
        if num_odds is not None and num_odds >= 99:
            odds = _normalize_odds(entry.get("ML")) or _normalize_odds(text_odds)
        else:
            odds = _normalize_odds(text_odds) or _normalize_odds(entry.get("ML"))
        if not odds:
            continue

        out[key] = {
            "name": name,
            "odds": odds,
            "jockey": (entry.get("Jockey") or "").strip() or None,
            "trainer": (entry.get("Trainer") or "").strip() or None,
            "post_position": post,
        }

    return out


def _update_picks(picks: list[dict], status_map: dict[str, dict]) -> dict[str, int]:
    """Apply TwinSpires status to picks rows.

    Returns counters for the run summary.
    """
    counters = {
        "odds_updated": 0,
        "meta_updated": 0,
        "newly_scratched": 0,
        "unscratched": 0,
    }
    now = iso_now()

    for p in picks:
        horse = p.get("horse_name") or ""
        status = status_map.get(_normalize(horse))
        if not status:
            continue

        # --- Scratch transitions ---
        was_scratched = bool(p.get("scratched"))
        if status.get("scratched"):
            if was_scratched:
                continue  # already known
            try:
                picks_table.update_item(
                    Key={"id": p["id"]},
                    UpdateExpression="SET scratched = :t, scratched_at = :n",
                    ExpressionAttributeValues={":t": True, ":n": now},
                    ConditionExpression="attribute_exists(id)",
                )
                counters["newly_scratched"] += 1
                log.info(
                    "odds_cron_auto_scratched",
                    extra={"pick_id": p["id"], "horse_name": horse},
                )
            except Exception as exc:  # pragma: no cover
                log.warning(
                    "odds_cron_scratch_failed",
                    extra={"pick_id": p["id"], "error": str(exc)},
                )
            continue

        # Horse is live in the feed — clear stale scratched flag if set.
        if was_scratched:
            try:
                picks_table.update_item(
                    Key={"id": p["id"]},
                    UpdateExpression="SET scratched = :f REMOVE scratched_at",
                    ExpressionAttributeValues={":f": False},
                    ConditionExpression="attribute_exists(id)",
                )
                counters["unscratched"] += 1
                log.info(
                    "odds_cron_unscratched",
                    extra={"pick_id": p["id"], "horse_name": horse},
                )
            except Exception as exc:  # pragma: no cover
                log.warning(
                    "odds_cron_unscratch_failed",
                    extra={"pick_id": p["id"], "error": str(exc)},
                )

        # --- Odds update ---
        new_odds = status.get("odds")
        if new_odds and new_odds != p.get("odds_at_pick"):
            try:
                picks_table.update_item(
                    Key={"id": p["id"]},
                    UpdateExpression=(
                        "SET odds_at_pick = :o, odds_updated_at = :n, odds_source = :s"
                    ),
                    ExpressionAttributeValues={
                        ":o": new_odds,
                        ":n": now,
                        ":s": "cron",
                    },
                    ConditionExpression="attribute_exists(id)",
                )
                counters["odds_updated"] += 1
            except Exception as exc:  # pragma: no cover
                log.warning(
                    "odds_cron_update_failed",
                    extra={"pick_id": p["id"], "error": str(exc)},
                )

        # --- Jockey / trainer / post_position update ---
        meta_changes: dict[str, str] = {}
        for field in ("jockey", "trainer", "post_position"):
            new_val = status.get(field)
            if new_val and new_val != p.get(field):
                meta_changes[field] = new_val
        if meta_changes:
            set_clauses = ", ".join(f"{k} = :{k}" for k in meta_changes)
            values = {f":{k}": v for k, v in meta_changes.items()}
            try:
                picks_table.update_item(
                    Key={"id": p["id"]},
                    UpdateExpression=f"SET {set_clauses}",
                    ExpressionAttributeValues=values,
                    ConditionExpression="attribute_exists(id)",
                )
                counters["meta_updated"] += 1
            except Exception as exc:  # pragma: no cover
                log.warning(
                    "odds_cron_meta_failed",
                    extra={"pick_id": p["id"], "error": str(exc), "fields": list(meta_changes)},
                )

    return counters


# Single canonical writeup for cron-added horses. Naming a specific scratched
# horse turned out to be misleading — late entries are typically also-eligibles
# entering the field, not 1:1 replacements, and an in-memory staleness bug had
# us blaming a horse who was already unscratched by the same cron run. The
# generic line is correct in every case and self-heals via _refresh_late_add_writeups.
LATE_ADD_WRITEUP = "Not worth your time."


def _refresh_late_add_writeups(picks: list[dict]) -> int:
    """Overwrite stale writeups on previously cron-added rows.

    Idempotent: skips rows that already match LATE_ADD_WRITEUP. Used to fix
    rows from an earlier cron version that wrote a misleading per-horse line.
    """
    now = iso_now()
    refreshed = 0
    for p in picks:
        if p.get("added_by") != "cron":
            continue
        if p.get("writeup") == LATE_ADD_WRITEUP:
            continue
        try:
            picks_table.update_item(
                Key={"id": p["id"]},
                UpdateExpression="SET writeup = :w, updated_at = :n",
                ExpressionAttributeValues={":w": LATE_ADD_WRITEUP, ":n": now},
                ConditionExpression="attribute_exists(id)",
            )
            refreshed += 1
        except Exception as exc:  # pragma: no cover
            log.warning(
                "odds_cron_writeup_refresh_failed",
                extra={"pick_id": p["id"], "error": str(exc)},
            )
    return refreshed


def _add_late_horses(
    event_id: str,
    race_number: int,
    picks: list[dict],
    status_map: dict[str, dict],
) -> int:
    """Insert picks rows for horses TwinSpires lists but we don't track yet.

    Returns count of horses added. Skips entries flagged scratched.
    """
    if not picks:
        return 0
    # Cron only runs after at least one pick exists for the event, so picks[0]
    # is guaranteed and gives us the post time we need to copy onto new rows.
    template = picks[0]
    race_post_time = template.get("race_post_time")
    if not race_post_time:
        log.warning(
            "odds_cron_no_template_post_time",
            extra={"event_id": event_id, "template_id": template.get("id")},
        )
        return 0

    existing_keys = {_normalize(p["horse_name"]) for p in picks if p.get("horse_name")}
    now = iso_now()
    added = 0

    for key, status in status_map.items():
        if key in existing_keys or status.get("scratched"):
            continue
        horse_name = status.get("name")
        if not horse_name:
            continue
        item: dict = {
            "id": str(uuid.uuid4()),
            "event_id": event_id,
            "race_number": race_number,
            "race_post_time": race_post_time,
            "horse_name": horse_name,
            "odds_at_pick": status.get("odds"),
            "odds_source": "cron",
            "odds_updated_at": now,
            "writeup": LATE_ADD_WRITEUP,
            "result": "pending",
            "confidence": 3,
            "display_order": 0,
            "scratched": False,
            "created_at": now,
            "updated_at": now,
            "added_by": "cron",
        }
        for field in ("jockey", "trainer", "post_position"):
            v = status.get(field)
            if v:
                item[field] = v
        try:
            picks_table.put_item(Item=item)
            added += 1
            log.info(
                "odds_cron_added_late_horse",
                extra={"event_id": event_id, "horse_name": horse_name, "post": item.get("post_position")},
            )
        except Exception as exc:  # pragma: no cover
            log.warning(
                "odds_cron_add_failed",
                extra={"horse_name": horse_name, "error": str(exc)},
            )

    return added


@handle_errors(HANDLER)
def handler(event, context):  # pragma: no cover — exercised in AWS
    summary: dict[str, dict] = {}
    started = datetime.now(timezone.utc).isoformat()

    for kind in TWINSPIRES_CONFIG_IDS:
        race_number = 12 if kind == "derby" else 11
        event_id = f"{CURRENT_YEAR}-kentucky-{kind}"

        if _race_is_over(event_id, race_number):
            summary[kind] = {"skipped": "race is over"}
            continue

        picks = _picks_for_event(event_id)
        if not picks:
            summary[kind] = {"skipped": "no picks in DDB yet"}
            continue

        status_map = _fetch_twinspires(kind)
        if not status_map:
            summary[kind] = {"skipped": "feed empty / fetch failed"}
            continue

        counts = _update_picks(picks, status_map)
        added = _add_late_horses(event_id, race_number, picks, status_map)
        # Self-heal: overwrite stale writeups on rows added by the prior cron
        # version that named a (sometimes already-unscratched) horse.
        refreshed = _refresh_late_add_writeups(picks)
        scratched_seen = sum(1 for v in status_map.values() if v.get("scratched"))
        unique_horses = {p["horse_name"] for p in picks if p.get("horse_name")}
        matched = sum(1 for h in unique_horses if _normalize(h) in status_map)
        summary[kind] = {
            "feed_size": len(status_map),
            "field_size": len(unique_horses),
            "matched": matched,
            "scratched_seen": scratched_seen,
            "newly_added": added,
            "writeups_refreshed": refreshed,
            **counts,
        }

    # If both events are over the cron has nothing left to do — flip the
    # EventBridge rule off so we stop firing every 15 minutes for nothing.
    # Also flip it off if we're past the hard safety cutoff (defaults to
    # 8 PM ET on Derby Saturday) regardless of result-entry state.
    # Only "race is over" is durable; transient fetch failures shouldn't
    # trip the self-disable.
    derby_done = summary.get("derby", {}).get("skipped") == "race is over"
    oaks_done = summary.get("oaks", {}).get("skipped") == "race is over"
    past_kill_time = False
    try:
        kill_at = datetime.fromisoformat(SAFE_KILL_AT)
        past_kill_time = datetime.now(timezone.utc) >= kill_at
        if past_kill_time:
            summary["_kill_switch"] = f"past safety cutoff {SAFE_KILL_AT}"
    except Exception:  # pragma: no cover
        pass

    if (derby_done and oaks_done) or past_kill_time:
        try:
            events = boto3.client("events", region_name=AWS_DEFAULT_REGION)
            rule_name = f"{APP_NAME}-odds-schedule"
            events.disable_rule(Name=rule_name)
            summary["_self"] = {"disabled_rule": rule_name}
            log.info("odds_cron_self_disabled", extra={"rule": rule_name})
        except Exception as exc:  # pragma: no cover
            log.warning("odds_cron_self_disable_failed", extra={"error": str(exc)})

    log.info("odds_cron_run", extra={"started": started, "summary": summary})

    # Persist run summary so admins can audit cron history without digging
    # through CloudWatch.
    try:
        poll_runs_table.put_item(
            Item={
                "id": str(uuid.uuid4()),
                "type": "odds_cron",
                "ran_at": started,
                "summary": json.dumps(summary),
            }
        )
    except Exception as exc:  # pragma: no cover
        log.warning("odds_cron_history_write_failed", extra={"error": str(exc)})

    return {
        "statusCode": 200,
        "body": str({"started": started, "summary": summary}),
        "isBase64Encoded": False,
    }

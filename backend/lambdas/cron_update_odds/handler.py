"""Cron — hourly scraper that refreshes the morning-line / current odds for
the Kentucky Derby + Oaks fields.

For each event in CURRENT_YEAR:
  1. If race-results already has finishers for the main race → skip (race is
     over, no point re-scraping).
  2. Pull picks for that event from DDB to know the canonical horse list.
  3. Fetch a few public odds pages and try to extract a horse → odds map.
  4. For each match, write the new odds_at_pick onto the picks row.

Failure-tolerant by design: a missing or restructured page logs a warning
and the cron runs again next hour. Admins can always override manually via
/admin-results/odds — those values get overwritten on the next cron, so
flip the schedule off (`odds_cron_enabled=false`) before locking in final
odds if you need them sticky.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone

import requests
from boto3.dynamodb.conditions import Key
from bs4 import BeautifulSoup

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

# Pages we'll try, in order. First page that produces matches wins for that event.
SOURCES: dict[str, list[str]] = {
    "derby": [
        "https://www.kentuckyderby.com/derby-horses/",
        "https://www.kentuckyderby.com/wager/live-odds/",
    ],
    "oaks": [
        "https://www.kentuckyderby.com/oaks-horses/",
    ],
}

# Window we scan after each horse name for the next odds-shaped token. The
# kentuckyderby.com leaderboard puts the trainer/jockey/odds in a column that
# can sit ~1.2 KB downstream of the name in the rendered HTML.
LOOKAHEAD_CHARS = 1800

ODDS_RE = re.compile(r"\b(\d{1,3})\s*[-/]\s*(\d{1,3})\b")
SCR_RE = re.compile(r"\bSCR\b")


def _normalize(name: str) -> str:
    return name.strip().lower().replace("’", "'")


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


def _looks_like_odds(num: int, denom: int) -> bool:
    if denom < 1 or denom > 10:
        return False
    if num < 1 or num > 200:
        return False
    return True


def _scrape_page(url: str, field: list[str]) -> dict[str, dict]:
    """Try to extract horse → status map from one URL.

    Each entry is one of:
      {"odds": "5-1"}   - horse is in the field with a live odds line
      {"scratched": True} - kentuckyderby.com marks SCR in the odds column

    Strategy: fetch HTML, strip tags, then for each horse name we know is
    in the field, look in a small window of text after each occurrence
    for either an SCR token or an odds-shaped token. Whichever appears
    first wins.
    """
    out: dict[str, dict] = {}
    try:
        resp = requests.get(url, timeout=10, headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
    except Exception as exc:  # pragma: no cover
        log.warning("odds_scrape_fetch_failed", extra={"url": url, "error": str(exc)})
        return out

    soup = BeautifulSoup(resp.text, "html.parser")
    text = soup.get_text(separator="  ", strip=True)
    text_lower = text.lower()

    for horse in field:
        target = _normalize(horse)
        if not target or target in (k.lower() for k in out.keys()):
            continue
        idx = text_lower.find(target)
        if idx == -1:
            continue
        window = text[idx + len(target) : idx + len(target) + LOOKAHEAD_CHARS]

        scr = SCR_RE.search(window)
        odds = None
        for m in ODDS_RE.finditer(window):
            n, d = int(m.group(1)), int(m.group(2))
            if _looks_like_odds(n, d):
                odds = (m.start(), f"{n}-{d}")
                break

        # If SCR appears before any plausible odds token, the horse is
        # scratched. Otherwise take the odds.
        if scr and (odds is None or scr.start() < odds[0]):
            out[horse] = {"scratched": True}
        elif odds is not None:
            out[horse] = {"odds": odds[1]}

    return out


def _scrape_event_status(field: list[str], urls: list[str]) -> dict[str, dict]:
    merged: dict[str, dict] = {}
    for url in urls:
        if len(merged) >= len(field):
            break
        page_map = _scrape_page(url, field)
        for k, v in page_map.items():
            merged.setdefault(k, v)
    return merged


def _update_picks(picks: list[dict], status_map: dict[str, dict]) -> dict[str, int]:
    """Returns counters: {'odds_updated': n, 'newly_scratched': n}."""
    odds_updated = 0
    newly_scratched = 0
    now = iso_now()

    for p in picks:
        status = status_map.get(p.get("horse_name", ""))
        if not status:
            continue

        # Auto-scratch detection.
        if status.get("scratched"):
            if p.get("scratched"):
                continue  # already known
            try:
                picks_table.update_item(
                    Key={"id": p["id"]},
                    UpdateExpression="SET scratched = :t, scratched_at = :n",
                    ExpressionAttributeValues={":t": True, ":n": now},
                    ConditionExpression="attribute_exists(id)",
                )
                newly_scratched += 1
                log.info(
                    "odds_cron_auto_scratched",
                    extra={"pick_id": p["id"], "horse_name": p.get("horse_name")},
                )
            except Exception as exc:  # pragma: no cover
                log.warning(
                    "odds_cron_scratch_failed",
                    extra={"pick_id": p["id"], "error": str(exc)},
                )
            continue

        # Odds update for non-scratched horses.
        if p.get("scratched"):
            continue
        new_odds = status.get("odds")
        if not new_odds or new_odds == p.get("odds_at_pick"):
            continue
        try:
            picks_table.update_item(
                Key={"id": p["id"]},
                UpdateExpression="SET odds_at_pick = :o, odds_updated_at = :n, odds_source = :s",
                ExpressionAttributeValues={":o": new_odds, ":n": now, ":s": "cron"},
                ConditionExpression="attribute_exists(id)",
            )
            odds_updated += 1
        except Exception as exc:  # pragma: no cover
            log.warning(
                "odds_cron_update_failed",
                extra={"pick_id": p["id"], "error": str(exc)},
            )

    return {"odds_updated": odds_updated, "newly_scratched": newly_scratched}


@handle_errors(HANDLER)
def handler(event, context):  # pragma: no cover — exercised in AWS
    summary: dict[str, dict] = {}
    started = datetime.now(timezone.utc).isoformat()

    for kind, urls in SOURCES.items():
        race_number = 12 if kind == "derby" else 11
        event_id = f"{CURRENT_YEAR}-kentucky-{kind}"

        if _race_is_over(event_id, race_number):
            summary[kind] = {"skipped": "race is over"}
            continue

        picks = _picks_for_event(event_id)
        if not picks:
            summary[kind] = {"skipped": "no picks in DDB yet"}
            continue

        field = sorted({p["horse_name"] for p in picks if p.get("horse_name")})
        status_map = _scrape_event_status(field, urls)
        counts = _update_picks(picks, status_map)

        scratched_seen = sum(1 for v in status_map.values() if v.get("scratched"))
        summary[kind] = {
            "field_size": len(field),
            "matched": len(status_map),
            "updated": counts["odds_updated"],
            "scratched_seen": scratched_seen,
            "newly_scratched": counts["newly_scratched"],
        }

    # If both events are over the cron has nothing left to do — flip the
    # EventBridge rule off so we stop firing every 15 minutes for nothing.
    # Also flip it off if we're past the hard safety cutoff (defaults to
    # 8 PM ET on Derby Saturday) regardless of result-entry state.
    derby_done = bool(summary.get("derby", {}).get("skipped"))
    oaks_done = bool(summary.get("oaks", {}).get("skipped"))
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

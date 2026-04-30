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


def _scrape_page(url: str, field: list[str]) -> dict[str, str]:
    """Try to extract horse → odds map from one URL.

    Strategy: fetch HTML, strip tags, then for each horse name we know is
    in the field, look in a small window of text after each occurrence for
    an odds-shaped token. Robust to CSS reshuffles since we don't depend
    on selectors.
    """
    out: dict[str, str] = {}
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
        for m in ODDS_RE.finditer(window):
            n, d = int(m.group(1)), int(m.group(2))
            if _looks_like_odds(n, d):
                out[horse] = f"{n}-{d}"
                break

    return out


def _scrape_event_odds(field: list[str], urls: list[str]) -> dict[str, str]:
    merged: dict[str, str] = {}
    for url in urls:
        if len(merged) >= len(field):
            break
        page_map = _scrape_page(url, field)
        for k, v in page_map.items():
            merged.setdefault(k, v)
    return merged


def _update_picks(picks: list[dict], odds_map: dict[str, str]) -> int:
    updated = 0
    now = iso_now()
    for p in picks:
        new_odds = odds_map.get(p.get("horse_name", ""))
        if not new_odds:
            continue
        if new_odds == p.get("odds_at_pick"):
            continue
        try:
            picks_table.update_item(
                Key={"id": p["id"]},
                UpdateExpression="SET odds_at_pick = :o, odds_updated_at = :n, odds_source = :s",
                ExpressionAttributeValues={
                    ":o": new_odds,
                    ":n": now,
                    ":s": "cron",
                },
                ConditionExpression="attribute_exists(id)",
            )
            updated += 1
        except Exception as exc:  # pragma: no cover
            log.warning(
                "odds_cron_update_failed",
                extra={"pick_id": p["id"], "error": str(exc)},
            )
    return updated


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
        odds_map = _scrape_event_odds(field, urls)
        updated = _update_picks(picks, odds_map)

        summary[kind] = {
            "field_size": len(field),
            "matched": len(odds_map),
            "updated": updated,
        }

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

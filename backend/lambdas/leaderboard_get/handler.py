"""GET /leaderboard/rank?year=YYYY&event=derby|oaks — per-event leaderboard.

For the requested event, returns one row per user with:
  - their picks (or null fields if the event hasn't locked yet)
  - per-slot points + total
  - finished flag (true once race_results land)
  - locked flag (true once post-time has passed)

Sorted by total points (then name).
"""

from __future__ import annotations

from decimal import Decimal

from boto3.dynamodb.conditions import Key

from lambdas.common.dynamo_helpers import (
    picks_table,
    predictions_table,
    query_all,
    race_results_table,
)
from lambdas.common.errors import handle_errors
from lambdas.common.predictions_data import event_locked
from lambdas.common.scoring import score_breakdown
from lambdas.common.utility_helpers import get_query_params, success_response

HANDLER = "leaderboard_get"

DEFAULT_YEAR = 2026
SUPPORTED_EVENTS = ("derby", "oaks")
PICKS_EVENT_INDEX = "event-index"


def _normalize_name(s: str | None) -> str:
    if not s:
        return ""
    return s.strip().lower().replace("’", "'")


def _norm_finishers(raw: list | None) -> list[dict]:
    out: list[dict] = []
    for f in raw or []:
        item = dict(f)
        pos = item.get("position")
        if isinstance(pos, Decimal):
            item["position"] = int(pos)
        out.append(item)
    return out


def _finishers_for(event_id: str, race_number: int) -> list[dict]:
    items = query_all(
        race_results_table,
        KeyConditionExpression=Key("event_id").eq(event_id) & Key("race_number").eq(race_number),
    )
    if not items:
        return []
    return _norm_finishers(items[0].get("finishers"))


def _predictions_for(event_id: str) -> list[dict]:
    return query_all(
        predictions_table,
        KeyConditionExpression=Key("event_id").eq(event_id),
    )


def _odds_index(event_id: str) -> dict[str, str | None]:
    """horse_name (normalized) -> odds_at_pick string."""
    items = query_all(
        picks_table,
        IndexName=PICKS_EVENT_INDEX,
        KeyConditionExpression=Key("event_id").eq(event_id),
    )
    out: dict[str, str | None] = {}
    for p in items:
        name = p.get("horse_name")
        if not name:
            continue
        out[_normalize_name(str(name))] = p.get("odds_at_pick")
    return out


@handle_errors(HANDLER)
def handler(event, context):
    qp = get_query_params(event)
    year_str = qp.get("year") or str(DEFAULT_YEAR)
    try:
        year = int(year_str)
    except ValueError:
        year = DEFAULT_YEAR

    event_kind = (qp.get("event") or "derby").lower()
    if event_kind not in SUPPORTED_EVENTS:
        event_kind = "derby"

    main_race = 12 if event_kind == "derby" else 11
    event_id = f"{year}-kentucky-{event_kind}"

    finishers = _finishers_for(event_id, main_race)
    locked = event_locked(event_id)
    finished = len(finishers) > 0
    odds_by_horse = _odds_index(event_id)

    rows = []
    for p in _predictions_for(event_id):
        username = p.get("username") or "?"
        breakdown = score_breakdown(p, finishers, odds_by_horse)
        rows.append({
            "username": username,
            "win_pick": p.get("win"),
            "place_pick": p.get("place"),
            "show_pick": p.get("show"),
            "long_shot_pick": p.get("long_shot"),
            "win_score": breakdown["win"],
            "place_score": breakdown["place"],
            "show_score": breakdown["show"],
            "long_shot_score": breakdown["long_shot"],
            "score": breakdown["total"],
        })

    rows.sort(key=lambda r: (-r["score"], r["username"].lower()))
    for i, r in enumerate(rows):
        r["rank"] = i + 1

    return success_response({
        "year": year,
        "event": event_kind,
        "locked": locked,
        "finished": finished,
        "rows": rows,
    })

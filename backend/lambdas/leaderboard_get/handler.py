"""GET /leaderboard/rank?year=YYYY — predictions × race-results scoring.

Aggregates each user's points across both events of the year (Derby + Oaks).
Returns rows ordered by total score, ties broken by name.
"""

from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from boto3.dynamodb.conditions import Key

from lambdas.common.dynamo_helpers import (
    predictions_table,
    query_all,
    race_results_table,
)
from lambdas.common.errors import handle_errors
from lambdas.common.scoring import score_prediction
from lambdas.common.utility_helpers import get_query_params, success_response

HANDLER = "leaderboard_get"

DEFAULT_YEAR = 2026


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


@handle_errors(HANDLER)
def handler(event, context):
    qp = get_query_params(event)
    year_str = qp.get("year") or str(DEFAULT_YEAR)
    try:
        year = int(year_str)
    except ValueError:
        year = DEFAULT_YEAR

    event_filter = (qp.get("event") or "all").lower()
    sources: list[tuple[str, list[dict]]] = []
    if event_filter in ("all", "derby"):
        ev_id = f"{year}-kentucky-derby"
        sources.append((ev_id, _finishers_for(ev_id, 12)))
    if event_filter in ("all", "oaks"):
        ev_id = f"{year}-kentucky-oaks"
        sources.append((ev_id, _finishers_for(ev_id, 11)))

    by_user: dict[str, dict] = defaultdict(lambda: {
        "username": "",
        "score": 0,
        "picks_made": 0,
    })

    for ev_id, finishers in sources:
        for p in _predictions_for(ev_id):
            username = p.get("username") or "?"
            rec = by_user[username]
            rec["username"] = username
            rec["picks_made"] += 1
            rec["score"] += score_prediction(p, finishers)

    rows = sorted(
        by_user.values(),
        key=lambda r: (-r["score"], r["username"].lower()),
    )

    return success_response({
        "year": year,
        "event": event_filter,
        "rows": [
            {
                "rank": i + 1,
                "username": r["username"],
                "score": r["score"],
                "picks_made": r["picks_made"],
            }
            for i, r in enumerate(rows)
        ],
    })

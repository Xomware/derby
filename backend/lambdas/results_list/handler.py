"""GET /results/list?year=YYYY — full Derby weekend race card with finishers.

Returns the schedule for both Oaks Day and Derby Day, merged with race results
keyed by (event_id, race_number). Defaults to the schedule's year.
"""

from __future__ import annotations

from decimal import Decimal

from boto3.dynamodb.conditions import Key

from lambdas.common.dynamo_helpers import query_all, race_results_table
from lambdas.common.errors import handle_errors
from lambdas.common.schedule import SCHEDULE
from lambdas.common.utility_helpers import get_query_params, success_response

HANDLER = "results_list"

DEFAULT_YEAR = 2026


def _norm_finishers(finishers: list | None) -> list[dict]:
    cleaned: list[dict] = []
    for f in finishers or []:
        c = dict(f)
        for k in ("position",):
            if isinstance(c.get(k), Decimal):
                c[k] = int(c[k])
        cleaned.append(c)
    cleaned.sort(key=lambda f: f.get("position", 99))
    return cleaned


def _fetch_results(event_id: str) -> dict[int, dict]:
    items = query_all(
        race_results_table,
        KeyConditionExpression=Key("event_id").eq(event_id),
    )
    out: dict[int, dict] = {}
    for row in items:
        rn = row.get("race_number")
        if isinstance(rn, Decimal):
            rn = int(rn)
        if rn is None:
            continue
        out[int(rn)] = row
    return out


@handle_errors(HANDLER)
def handler(event, context):
    qp = get_query_params(event)
    year_str = qp.get("year") or str(DEFAULT_YEAR)
    try:
        year = int(year_str)
    except ValueError:
        year = DEFAULT_YEAR

    derby_results = _fetch_results(f"{year}-kentucky-derby")
    oaks_results = _fetch_results(f"{year}-kentucky-oaks")

    races: list[dict] = []
    for slot in SCHEDULE:
        rn = slot["race_number"]
        merged: dict = {
            "day": slot["day"],
            "race_number": rn,
            "post_time": slot["post_time"],
            "name": slot.get("name"),
            "finishers": [],
            "official_at": None,
            "notes": None,
            "source": None,
        }
        saved = (oaks_results if slot["day"] == "oaks" else derby_results).get(rn)
        if saved:
            merged["finishers"] = _norm_finishers(saved.get("finishers"))
            merged["official_at"] = saved.get("official_at")
            merged["notes"] = saved.get("notes")
            merged["source"] = saved.get("source")
        races.append(merged)

    return success_response({"year": year, "races": races})

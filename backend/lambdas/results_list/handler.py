"""GET /results/list — full Derby weekend race card with finishers as they land.

Returns the schedule for both Oaks Day and Derby Day, merged with any race
results that have been entered (manually via /admin or by the cron poller).
Each race entry has finishers when results exist, empty otherwise.
"""

from __future__ import annotations

from decimal import Decimal

from lambdas.common.dynamo_helpers import race_results_table, scan_all
from lambdas.common.errors import handle_errors
from lambdas.common.schedule import SCHEDULE
from lambdas.common.utility_helpers import success_response

HANDLER = "results_list"


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


@handle_errors(HANDLER)
def handler(event, context):
    # Pull every saved race-result row, key by race_number for fast merge.
    saved = {}
    for row in scan_all(race_results_table):
        rn = row.get("race_number")
        if isinstance(rn, Decimal):
            rn = int(rn)
        if rn is None:
            continue
        saved[int(rn)] = row

    # The schedule may have repeated race_numbers across days, so we key by
    # (day, race_number). Saved results are race-number-only — we apply the
    # same finishers to whichever day's race matches. (Two race-1 entries
    # exist; the cron / admin form should specify day if we ever need it.)
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
        if rn in saved:
            row = saved[rn]
            merged["finishers"] = _norm_finishers(row.get("finishers"))
            merged["official_at"] = row.get("official_at")
            merged["notes"] = row.get("notes")
            merged["source"] = row.get("source")
        races.append(merged)

    return success_response({"races": races})

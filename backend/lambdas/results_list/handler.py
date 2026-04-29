"""GET /results/list — race-level finishers for the Derby card.

Returns one record per race that has been entered. Empty list before any
results land. Authed users only — site is gated.
"""

from __future__ import annotations

from decimal import Decimal

from lambdas.common.dynamo_helpers import race_results_table, scan_all
from lambdas.common.errors import handle_errors
from lambdas.common.utility_helpers import success_response

HANDLER = "results_list"


def _norm(item: dict) -> dict:
    out = dict(item)
    if isinstance(out.get("race_number"), Decimal):
        out["race_number"] = int(out["race_number"])
    finishers = out.get("finishers") or []
    cleaned = []
    for f in finishers:
        c = dict(f)
        for k in ("position",):
            if isinstance(c.get(k), Decimal):
                c[k] = int(c[k])
        cleaned.append(c)
    out["finishers"] = cleaned
    return out


@handle_errors(HANDLER)
def handler(event, context):
    rows = [_norm(r) for r in scan_all(race_results_table)]
    rows.sort(key=lambda r: r.get("race_number", 0))
    return success_response({"races": rows})

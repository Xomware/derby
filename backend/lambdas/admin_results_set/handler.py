"""POST /admin-results/set — upsert race-level results.

Body:
{
  "race_number": 12,
  "official_at": "2026-05-02T23:08:00Z" (optional),
  "finishers": [
    {"position": 1, "horse_name": "...", "jockey": "...", "win_payout": "8.20"},
    {"position": 2, "horse_name": "...", ...},
    {"position": 3, "horse_name": "...", ...}
  ],
  "notes": "..." (optional)
}
"""

from __future__ import annotations

from lambdas.common.dynamo_helpers import race_results_table
from lambdas.common.errors import ForbiddenError, ValidationError, handle_errors
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    iso_now,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "admin_results_set"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    if ctx.get("isAdmin") != "true":
        raise ForbiddenError("Admin only")
    username = ctx.get("username") or "?"

    body = parse_body(event)
    require_fields(body, "race_number", "finishers")
    try:
        race_number = int(body["race_number"])
    except (TypeError, ValueError):
        raise ValidationError("race_number must be an integer", field="race_number")
    if not 1 <= race_number <= 20:
        raise ValidationError("race_number must be 1-20", field="race_number")

    finishers = body["finishers"]
    if not isinstance(finishers, list) or not finishers:
        raise ValidationError("finishers must be a non-empty list", field="finishers")

    cleaned = []
    for f in finishers:
        if not isinstance(f, dict):
            raise ValidationError("each finisher must be an object", field="finishers")
        if "position" not in f or "horse_name" not in f:
            raise ValidationError("finishers need position + horse_name", field="finishers")
        cleaned.append({
            "position": int(f["position"]),
            "horse_name": str(f["horse_name"]).strip(),
            "jockey": str(f.get("jockey") or "")[:120] or None,
            "win_payout": str(f.get("win_payout") or "")[:20] or None,
            "place_payout": str(f.get("place_payout") or "")[:20] or None,
            "show_payout": str(f.get("show_payout") or "")[:20] or None,
        })
    cleaned.sort(key=lambda x: x["position"])

    item = {
        "race_number": race_number,
        "finishers": cleaned,
        "official_at": str(body.get("official_at") or "")[:40] or None,
        "notes": str(body.get("notes") or "")[:500] or None,
        "updated_at": iso_now(),
        "updated_by": username,
        "source": "manual",
    }
    race_results_table.put_item(Item=item)
    return success_response(item)

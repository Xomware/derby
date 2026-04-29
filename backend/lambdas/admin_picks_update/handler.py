"""PATCH /admin/picks/{id} — update a pick."""

from __future__ import annotations

from lambdas.common.dynamo_helpers import picks_table
from lambdas.common.errors import ForbiddenError, NotFoundError, handle_errors
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    iso_now,
    parse_body,
    success_response,
)

HANDLER = "admin_picks_update"
ALLOWED = {
    "race_number", "race_post_time", "horse_name", "post_position",
    "jockey", "trainer", "odds_at_pick", "confidence", "writeup", "display_order",
}


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    if ctx.get("isAdmin") != "true":
        raise ForbiddenError("Admin only")

    body = parse_body(event)
    pick_id = body.get("id")
    if not pick_id:
        raise NotFoundError("Pick not found")

    pick = picks_table.get_item(Key={"id": pick_id}).get("Item")
    if not pick:
        raise NotFoundError("Pick not found")

    updates = {k: v for k, v in body.items() if k in ALLOWED and v is not None}
    if not updates:
        return success_response(pick)

    if "race_number" in updates:
        updates["race_number"] = int(updates["race_number"])
    if "post_position" in updates:
        updates["post_position"] = int(updates["post_position"])
    if "confidence" in updates:
        updates["confidence"] = int(updates["confidence"])
    if "display_order" in updates:
        updates["display_order"] = int(updates["display_order"])

    updates["updated_at"] = iso_now()

    expr = "SET " + ", ".join(f"#{k} = :{k}" for k in updates.keys())
    names = {f"#{k}": k for k in updates.keys()}
    values = {f":{k}": v for k, v in updates.items()}
    picks_table.update_item(
        Key={"id": pick_id},
        UpdateExpression=expr,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )
    refreshed = picks_table.get_item(Key={"id": pick_id}).get("Item")
    return success_response(refreshed)

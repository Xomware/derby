"""POST /admin/picks — create a pick (admin only)."""

from __future__ import annotations

import uuid

from lambdas.common.constants import EVENT_ID
from lambdas.common.dynamo_helpers import picks_table
from lambdas.common.errors import ForbiddenError, ValidationError, handle_errors
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    iso_now,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "admin_picks_create"
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
    require_fields(body, "race_number", "race_post_time", "horse_name")

    if not 1 <= int(body["race_number"]) <= 20:
        raise ValidationError("race_number must be 1–20", field="race_number")
    if "confidence" in body and not 1 <= int(body["confidence"]) <= 5:
        raise ValidationError("confidence must be 1–5", field="confidence")

    item = {
        "id": str(uuid.uuid4()),
        "event_id": EVENT_ID,
        "result": "pending",
        "confidence": 3,
        "display_order": 0,
        "created_at": iso_now(),
        "updated_at": iso_now(),
    }
    for k in ALLOWED:
        if k in body and body[k] is not None:
            item[k] = body[k]
    item["race_number"] = int(item["race_number"])
    if "post_position" in item and item["post_position"] is not None:
        item["post_position"] = int(item["post_position"])
    item["confidence"] = int(item.get("confidence", 3))
    item["display_order"] = int(item.get("display_order", 0))

    picks_table.put_item(Item=item)
    return success_response(item, status=201)

"""PATCH /admin/picks/{id}/result — manual result override."""

from __future__ import annotations

from lambdas.common.constants import RESULT_VALUES
from lambdas.common.dynamo_helpers import picks_table
from lambdas.common.errors import ForbiddenError, NotFoundError, ValidationError, handle_errors
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    iso_now,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "admin_picks_set_result"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    if ctx.get("isAdmin") != "true":
        raise ForbiddenError("Admin only")

    body = parse_body(event)
    require_fields(body, "id", "result")
    pick_id = str(body["id"])
    result = str(body["result"])
    if result not in RESULT_VALUES:
        raise ValidationError(f"result must be one of {RESULT_VALUES}", field="result")

    pick = picks_table.get_item(Key={"id": pick_id}).get("Item")
    if not pick:
        raise NotFoundError("Pick not found")

    picks_table.update_item(
        Key={"id": pick_id},
        UpdateExpression="SET #r = :r, updated_at = :u",
        ExpressionAttributeNames={"#r": "result"},
        ExpressionAttributeValues={":r": result, ":u": iso_now()},
    )
    refreshed = picks_table.get_item(Key={"id": pick_id}).get("Item")
    return success_response(refreshed)

"""DELETE /admin/picks/{id} — remove a pick and its votes."""

from __future__ import annotations

from boto3.dynamodb.conditions import Key

from lambdas.common.dynamo_helpers import picks_table, query_all, votes_table
from lambdas.common.errors import ForbiddenError, NotFoundError, handle_errors
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    no_content,
    parse_body,
)

HANDLER = "admin_picks_delete"


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

    votes = query_all(votes_table, KeyConditionExpression=Key("pick_id").eq(pick_id))
    with votes_table.batch_writer() as batch:
        for v in votes:
            batch.delete_item(Key={"pick_id": v["pick_id"], "user_id": v["user_id"]})

    picks_table.delete_item(Key={"id": pick_id})
    return no_content()

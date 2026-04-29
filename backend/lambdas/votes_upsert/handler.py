"""POST /votes — cast or change a tail/fade/pass vote. Locks at race post time."""

from __future__ import annotations

from datetime import datetime

from lambdas.common.constants import VOTE_VALUES
from lambdas.common.dynamo_helpers import picks_table, votes_table
from lambdas.common.errors import (
    ConflictError,
    LockedError,
    NotFoundError,
    UnauthorizedError,
    ValidationError,
    handle_errors,
)
from lambdas.common.picks_data import is_locked
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    iso_now,
    parse_body,
    require_fields,
    success_response,
    utcnow,
)

HANDLER = "votes_upsert"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    user_id = ctx.get("userId")
    if not user_id:
        raise UnauthorizedError()

    body = parse_body(event)
    require_fields(body, "pick_id", "vote")
    pick_id = str(body["pick_id"])
    vote = str(body["vote"])
    if vote not in VOTE_VALUES:
        raise ValidationError("vote must be tail|fade|pass", field="vote")

    pick = picks_table.get_item(Key={"id": pick_id}).get("Item")
    if not pick:
        raise NotFoundError("Pick not found")

    if is_locked(pick["race_post_time"]):
        raise LockedError("Voting is locked for this race")
    if pick.get("result") == "scratched":
        raise ConflictError("This pick was scratched")

    now = iso_now()
    existing = votes_table.get_item(Key={"pick_id": pick_id, "user_id": user_id}).get("Item")
    if existing:
        votes_table.update_item(
            Key={"pick_id": pick_id, "user_id": user_id},
            UpdateExpression="SET vote = :v, updated_at = :u",
            ExpressionAttributeValues={":v": vote, ":u": now},
        )
        return success_response({"pick_id": pick_id, "vote": vote, "updated_at": now})

    votes_table.put_item(
        Item={
            "pick_id": pick_id,
            "user_id": user_id,
            "vote": vote,
            "created_at": now,
            "updated_at": now,
        }
    )
    return success_response({"pick_id": pick_id, "vote": vote, "updated_at": now}, status=201)

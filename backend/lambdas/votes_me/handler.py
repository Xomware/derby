"""GET /votes/me — current user's votes."""

from __future__ import annotations

from lambdas.common.errors import UnauthorizedError, handle_errors
from lambdas.common.picks_data import votes_for_user
from lambdas.common.utility_helpers import get_authorizer_context, success_response

HANDLER = "votes_me"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    user_id = ctx.get("userId")
    if not user_id:
        raise UnauthorizedError()

    rows = votes_for_user(user_id)
    return success_response([
        {
            "pick_id": r["pick_id"],
            "vote": r["vote"],
            "updated_at": r.get("updated_at"),
        }
        for r in rows
    ])

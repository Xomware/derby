"""GET /picks/{id} — single pick with vote counts + voter usernames."""

from __future__ import annotations

from lambdas.common.dynamo_helpers import picks_table, scan_all, users_table
from lambdas.common.errors import NotFoundError, handle_errors
from lambdas.common.picks_data import serialize_pick, votes_for_picks
from lambdas.common.utility_helpers import get_authorizer_context, get_path_params, success_response

HANDLER = "picks_get"


@handle_errors(HANDLER)
def handler(event, context):
    pick_id = (get_path_params(event) or {}).get("id")
    if not pick_id:
        raise NotFoundError("Pick not found")

    pick = picks_table.get_item(Key={"id": pick_id}).get("Item")
    if not pick:
        raise NotFoundError("Pick not found")

    votes = votes_for_picks([pick_id])
    user_ids = {v["user_id"] for v in votes}
    rows = scan_all(users_table) if user_ids else []
    usernames = {r["id"]: r["username"] for r in rows if r["id"] in user_ids}

    ctx = get_authorizer_context(event)
    current_user_id = ctx.get("userId") or None
    return success_response(serialize_pick(pick, votes, usernames, current_user_id))

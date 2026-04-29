"""GET /picks — picks for the active event, grouped by race."""

from __future__ import annotations

from lambdas.common.dynamo_helpers import scan_all, users_table
from lambdas.common.errors import handle_errors
from lambdas.common.picks_data import (
    list_picks_for_event,
    picks_grouped_by_race,
    votes_for_picks,
)
from lambdas.common.utility_helpers import get_authorizer_context, success_response

HANDLER = "picks_list"


@handle_errors(HANDLER)
def handler(event, context):
    picks = list_picks_for_event()
    pick_ids = [p["id"] for p in picks]
    votes = votes_for_picks(pick_ids)

    user_ids = {v["user_id"] for v in votes}
    usernames_by_id = _usernames_for(user_ids)

    ctx = get_authorizer_context(event)
    current_user_id = ctx.get("userId") or None

    grouped = picks_grouped_by_race(picks, votes, usernames_by_id, current_user_id)
    return success_response(grouped)


def _usernames_for(user_ids: set[str]) -> dict[str, str]:
    if not user_ids:
        return {}
    # Small leaderboard — scan + filter is fine for derby. Switch to BatchGetItem
    # via the GSI if signups grow past ~500.
    rows = scan_all(users_table)
    return {r["id"]: r["username"] for r in rows if r["id"] in user_ids}

"""GET /picks/list — picks for an event, grouped by race.

Query params:
  event_id (optional) — defaults to constants.EVENT_ID (Kentucky Derby).
                        Pass "2026-kentucky-oaks" for Oaks.
"""

from __future__ import annotations

from lambdas.common.constants import EVENT_ID
from lambdas.common.dynamo_helpers import scan_all, users_table
from lambdas.common.errors import handle_errors
from lambdas.common.picks_data import (
    list_picks_for_event,
    picks_grouped_by_race,
    votes_for_picks,
)
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    get_query_params,
    success_response,
)

HANDLER = "picks_list"


@handle_errors(HANDLER)
def handler(event, context):
    qp = get_query_params(event)
    event_id = (qp.get("event_id") or EVENT_ID).strip()

    picks = list_picks_for_event(event_id)
    pick_ids = [p["id"] for p in picks]
    votes = votes_for_picks(pick_ids)

    user_ids = {v["user_id"] for v in votes}
    usernames_by_id = _usernames_for(user_ids)

    ctx = get_authorizer_context(event)
    current_user_id = ctx.get("userId") or None

    grouped = picks_grouped_by_race(picks, votes, usernames_by_id, current_user_id)
    # Override the event metadata to match what was requested.
    grouped["event"] = {**grouped["event"], "id": event_id}
    return success_response(grouped)


def _usernames_for(user_ids: set[str]) -> dict[str, str]:
    if not user_ids:
        return {}
    rows = scan_all(users_table)
    return {r["id"]: r["username"] for r in rows if r["id"] in user_ids}

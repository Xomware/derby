"""GET /admin/poll-status — last poll run + window/state info."""

from __future__ import annotations

from boto3.dynamodb.conditions import Key

from lambdas.common.constants import (
    POLL_ENABLED,
    POLL_RUNS_TYPE_INDEX,
    POLL_WINDOW_END_UTC,
    POLL_WINDOW_START_UTC,
)
from lambdas.common.dynamo_helpers import poll_runs_table
from lambdas.common.errors import ForbiddenError, handle_errors
from lambdas.common.utility_helpers import get_authorizer_context, success_response

HANDLER = "admin_poll_status"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    if ctx.get("isAdmin") != "true":
        raise ForbiddenError("Admin only")

    last = None
    page = poll_runs_table.query(
        IndexName=POLL_RUNS_TYPE_INDEX,
        KeyConditionExpression=Key("type").eq("poll"),
        ScanIndexForward=False,
        Limit=1,
    )
    items = page.get("Items") or []
    if items:
        last = items[0]

    return success_response({
        "last_ran_at": last.get("ran_at") if last else None,
        "last_source": last.get("source") if last else None,
        "last_picks_updated": int(last.get("picks_updated", 0)) if last else None,
        "last_errors": last.get("errors") if last else None,
        "poll_enabled": POLL_ENABLED,
        "window_start_utc": POLL_WINDOW_START_UTC or None,
        "window_end_utc": POLL_WINDOW_END_UTC or None,
    })

"""POST /admin/poll-now — manual run, ignores window."""

from __future__ import annotations

from lambdas.common.errors import ForbiddenError, handle_errors
from lambdas.common.poll_helpers import run_poll_once
from lambdas.common.utility_helpers import get_authorizer_context, success_response

HANDLER = "admin_poll_now"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    if ctx.get("isAdmin") != "true":
        raise ForbiddenError("Admin only")
    return success_response(run_poll_once(force=True))

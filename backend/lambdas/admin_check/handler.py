"""POST /admin-results/check — verify admin password without doing anything.

Body: {"admin_token": "derbytime"}
Returns 200 if it matches the ADMIN_TOKEN env, 403 otherwise.
"""

from __future__ import annotations

from lambdas.common.constants import ADMIN_TOKEN
from lambdas.common.errors import ForbiddenError, handle_errors
from lambdas.common.utility_helpers import parse_body, success_response

HANDLER = "admin_check"


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    if not ADMIN_TOKEN or body.get("admin_token") != ADMIN_TOKEN:
        raise ForbiddenError("Bad admin password")
    return success_response({"ok": True})

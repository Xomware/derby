"""GET /auth/me — current user."""

from __future__ import annotations

from lambdas.common.errors import UnauthorizedError, handle_errors
from lambdas.common.utility_helpers import get_authorizer_context, success_response

HANDLER = "auth_me"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    if not ctx.get("userId"):
        raise UnauthorizedError()
    return success_response({
        "id": ctx["userId"],
        "email": ctx["email"],
        "username": ctx["username"],
        "is_admin": ctx.get("isAdmin", "false") == "true",
    })

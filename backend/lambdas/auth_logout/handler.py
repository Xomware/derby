"""POST /auth/logout — clear session cookie."""

from __future__ import annotations

from lambdas.common.constants import COOKIE_DOMAIN, SESSION_COOKIE
from lambdas.common.errors import handle_errors
from lambdas.common.utility_helpers import expire_cookie, no_content

HANDLER = "auth_logout"


@handle_errors(HANDLER)
def handler(event, context):
    return no_content(set_cookies=[
        expire_cookie(SESSION_COOKIE, domain=COOKIE_DOMAIN or None),
    ])

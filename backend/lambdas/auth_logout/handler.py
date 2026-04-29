"""POST /auth/logout — clear session cookies."""

from __future__ import annotations

from lambdas.common.constants import COOKIE_DOMAIN, SESSION_COOKIE, SIGNUP_COOKIE
from lambdas.common.errors import handle_errors
from lambdas.common.utility_helpers import expire_cookie, no_content

HANDLER = "auth_logout"


@handle_errors(HANDLER)
def handler(event, context):
    return no_content(set_cookies=[
        expire_cookie(SESSION_COOKIE, domain=COOKIE_DOMAIN or None),
        expire_cookie(SIGNUP_COOKIE, domain=COOKIE_DOMAIN or None),
    ])

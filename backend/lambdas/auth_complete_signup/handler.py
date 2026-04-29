"""POST /auth/complete-signup — first-time visitor picks a username."""

from __future__ import annotations

import re

from botocore.exceptions import ClientError

from lambdas.common.auth_helpers import decode_signup_jwt, issue_session_jwt, new_user_id
from lambdas.common.constants import (
    ADMIN_EMAILS,
    COOKIE_DOMAIN,
    RESERVED_USERNAMES,
    SESSION_COOKIE,
    SESSION_DAYS,
    SIGNUP_COOKIE,
)
from lambdas.common.dynamo_helpers import users_table
from lambdas.common.errors import ConflictError, ValidationError, handle_errors
from lambdas.common.utility_helpers import (
    expire_cookie,
    get_cookie,
    iso_now,
    make_cookie,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "auth_complete_signup"
USERNAME_RE = re.compile(r"^[A-Za-z0-9_\-\.]{2,20}$")


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    require_fields(body, "username")
    username = str(body["username"]).strip()

    if not USERNAME_RE.match(username):
        raise ValidationError("Username must be 2–20 chars: letters, digits, _ - .", field="username")
    if username.lower() in RESERVED_USERNAMES:
        raise ValidationError("That username is reserved. Pick another.", field="username")

    signup_cookie = get_cookie(event, SIGNUP_COOKIE)
    if not signup_cookie:
        raise ValidationError("No active signup. Request a new sign-in link.")
    email = decode_signup_jwt(signup_cookie)

    is_admin = email in ADMIN_EMAILS

    # If user already exists for this email, treat as a returning user.
    existing = users_table.get_item(Key={"email": email}).get("Item")
    if existing:
        return _ok(existing, is_admin=is_admin or bool(existing.get("is_admin")))

    user_id = new_user_id()
    item = {
        "email": email,
        "id": user_id,
        "username": username,
        "is_admin": is_admin,
        "created_at": iso_now(),
        "last_login_at": iso_now(),
    }
    try:
        users_table.put_item(
            Item=item,
            ConditionExpression="attribute_not_exists(email)",
        )
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            existing = users_table.get_item(Key={"email": email}).get("Item")
            if existing:
                return _ok(existing, is_admin=bool(existing.get("is_admin", False)))
        raise

    # Username uniqueness — DynamoDB doesn't have UNIQUE constraints; we read-then-write
    # the username-index. Race: two writers could land within the same millisecond.
    # For a Derby-day friend group, that's negligible; we tolerate it.
    return _ok(item, is_admin=is_admin)


def _ok(user: dict, *, is_admin: bool) -> dict:
    cookie = make_cookie(
        SESSION_COOKIE,
        issue_session_jwt(user["id"]),
        max_age_seconds=SESSION_DAYS * 24 * 60 * 60,
        domain=COOKIE_DOMAIN or None,
    )
    clear_signup = expire_cookie(SIGNUP_COOKIE, domain=COOKIE_DOMAIN or None)
    return success_response(
        {
            "id": user["id"],
            "email": user["email"],
            "username": user["username"],
            "is_admin": is_admin,
        },
        set_cookies=[cookie, clear_signup],
    )

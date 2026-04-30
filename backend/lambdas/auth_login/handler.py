"""POST /auth/login — sign in with username + password."""

from __future__ import annotations

from boto3.dynamodb.conditions import Key

from lambdas.common.auth_helpers import issue_session_jwt
from lambdas.common.constants import (
    ADMIN_USERNAMES,
    COOKIE_DOMAIN,
    SESSION_COOKIE,
    SESSION_DAYS,
    USERS_USERNAME_INDEX,
)
from lambdas.common.dynamo_helpers import query_all, users_table
from lambdas.common.errors import UnauthorizedError, ValidationError, handle_errors
from lambdas.common.password_helpers import verify_password
from lambdas.common.utility_helpers import (
    iso_now,
    make_cookie,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "auth_login"


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    # Accept either {username, password} or {identifier, password} — the latter
    # is the legacy field name from when email login was on the table.
    password = str(body.get("password") or "")
    username = str(body.get("username") or body.get("identifier") or "").strip()
    if not username or not password:
        raise ValidationError("Missing username or password")

    user = _resolve_user(username)
    if not user or not verify_password(password, user.get("password_hash") or ""):
        # Same error for either branch — don't leak which one was wrong.
        raise UnauthorizedError("Invalid username or password")

    updates: dict = {"last_login_at": iso_now()}
    if user["username"].lower() in ADMIN_USERNAMES and not user.get("is_admin"):
        updates["is_admin"] = True
    _patch_user(user["email"], updates)

    cookie = make_cookie(
        SESSION_COOKIE,
        issue_session_jwt(user["id"]),
        max_age_seconds=SESSION_DAYS * 24 * 60 * 60,
        domain=COOKIE_DOMAIN or None,
    )
    return success_response(
        {
            "id": user["id"],
            "username": user["username"],
            "is_admin": bool(updates.get("is_admin", user.get("is_admin", False))),
        },
        set_cookies=[cookie],
    )


def _resolve_user(username: str) -> dict | None:
    rows = query_all(
        users_table,
        IndexName=USERS_USERNAME_INDEX,
        KeyConditionExpression=Key("username").eq(username),
        Limit=1,
    )
    return rows[0] if rows else None


def _patch_user(email: str, updates: dict) -> None:
    expr = "SET " + ", ".join(f"#{k} = :{k}" for k in updates.keys())
    names = {f"#{k}": k for k in updates.keys()}
    values = {f":{k}": v for k, v in updates.items()}
    users_table.update_item(
        Key={"email": email},
        UpdateExpression=expr,
        ExpressionAttributeNames=names,
        ExpressionAttributeValues=values,
    )

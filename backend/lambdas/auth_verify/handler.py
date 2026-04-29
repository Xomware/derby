"""GET /auth/verify?token=... — consume magic token, set session or signup cookie."""

from __future__ import annotations

from boto3.dynamodb.conditions import Key

from lambdas.common.auth_helpers import issue_session_jwt, issue_signup_jwt
from lambdas.common.constants import (
    ADMIN_EMAILS,
    COOKIE_DOMAIN,
    SESSION_COOKIE,
    SESSION_DAYS,
    SIGNUP_COOKIE,
)
from lambdas.common.dynamo_helpers import magic_link_table, users_table
from lambdas.common.errors import ValidationError, handle_errors
from lambdas.common.utility_helpers import (
    expire_cookie,
    get_query_params,
    iso_now,
    make_cookie,
    success_response,
    utcnow,
)

HANDLER = "auth_verify"


@handle_errors(HANDLER)
def handler(event, context):
    qp = get_query_params(event)
    token = qp.get("token")
    if not token:
        raise ValidationError("Missing token", field="token")

    record = magic_link_table.get_item(Key={"token": token}).get("Item")
    if not record:
        raise ValidationError("Invalid or expired link")

    if record.get("used_at"):
        raise ValidationError("That link was already used")

    expires_epoch = int(record.get("expires_at", 0))
    if expires_epoch < int(utcnow().timestamp()):
        raise ValidationError("Sign-in link expired. Request a new one.")

    email = record["email"]
    magic_link_table.update_item(
        Key={"token": token},
        UpdateExpression="SET used_at = :now",
        ExpressionAttributeValues={":now": iso_now()},
    )

    user = users_table.get_item(Key={"email": email}).get("Item")
    if user:
        # Returning user.
        updates = {"last_login_at": iso_now()}
        if email in ADMIN_EMAILS and not user.get("is_admin"):
            updates["is_admin"] = True
        _patch_user(email, updates)

        cookie = make_cookie(
            SESSION_COOKIE,
            issue_session_jwt(user["id"]),
            max_age_seconds=SESSION_DAYS * 24 * 60 * 60,
            domain=COOKIE_DOMAIN or None,
        )
        clear_signup = expire_cookie(SIGNUP_COOKIE, domain=COOKIE_DOMAIN or None)
        return success_response(
            {
                "needs_username": False,
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "username": user["username"],
                    "is_admin": bool(updates.get("is_admin", user.get("is_admin", False))),
                },
            },
            set_cookies=[cookie, clear_signup],
        )

    # First-time visitor: signup cookie carries verified email for the next call.
    signup_cookie = make_cookie(
        SIGNUP_COOKIE,
        issue_signup_jwt(email),
        max_age_seconds=15 * 60,
        domain=COOKIE_DOMAIN or None,
    )
    return success_response({"needs_username": True, "user": None}, set_cookies=[signup_cookie])


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

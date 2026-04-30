"""POST /auth/signup — create account with username + password."""

from __future__ import annotations

import re

from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

from lambdas.common.auth_helpers import issue_session_jwt, new_user_id
from lambdas.common.constants import (
    ADMIN_USERNAMES,
    COOKIE_DOMAIN,
    RESERVED_USERNAMES,
    SESSION_COOKIE,
    SESSION_DAYS,
    SYNTHETIC_EMAIL_DOMAIN,
    USERS_USERNAME_INDEX,
)
from lambdas.common.dynamo_helpers import query_all, users_table
from lambdas.common.errors import ConflictError, ValidationError, handle_errors
from lambdas.common.password_helpers import hash_password, password_is_valid
from lambdas.common.utility_helpers import (
    iso_now,
    make_cookie,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "auth_signup"

USERNAME_RE = re.compile(r"^[A-Za-z0-9_\-\.]{2,20}$")


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    require_fields(body, "username", "password")

    username = str(body["username"]).strip()
    password = str(body["password"])

    if not USERNAME_RE.match(username):
        raise ValidationError("Username must be 2–20 chars: letters, digits, _ - .", field="username")
    if username.lower() in RESERVED_USERNAMES:
        raise ValidationError("That username is reserved", field="username")

    ok, msg = password_is_valid(password)
    if not ok:
        raise ValidationError(msg or "Invalid password", field="password")

    # Synthetic email is the DynamoDB PK — never exposed to the user.
    email = f"{username.lower()}@{SYNTHETIC_EMAIL_DOMAIN}"

    if query_all(
        users_table,
        IndexName=USERS_USERNAME_INDEX,
        KeyConditionExpression=Key("username").eq(username),
        Limit=1,
    ):
        raise ConflictError("Username taken — pick another")

    user_id = new_user_id()
    now = iso_now()
    is_admin = username.lower() in ADMIN_USERNAMES
    item = {
        "email": email,
        "id": user_id,
        "username": username,
        "password_hash": hash_password(password),
        "is_admin": is_admin,
        "created_at": now,
        "last_login_at": now,
    }
    try:
        users_table.put_item(Item=item, ConditionExpression="attribute_not_exists(email)")
    except ClientError as e:
        if e.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            raise ConflictError("That username slot is taken — pick another")
        raise

    cookie = make_cookie(
        SESSION_COOKIE,
        issue_session_jwt(user_id),
        max_age_seconds=SESSION_DAYS * 24 * 60 * 60,
        domain=COOKIE_DOMAIN or None,
    )
    return success_response(
        {"id": user_id, "username": username, "is_admin": is_admin},
        status=201,
        set_cookies=[cookie],
    )

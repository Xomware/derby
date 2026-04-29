"""POST /auth/update-username — current user changes their handle."""

from __future__ import annotations

import re

from boto3.dynamodb.conditions import Key

from lambdas.common.constants import RESERVED_USERNAMES, USERS_USERNAME_INDEX
from lambdas.common.dynamo_helpers import query_all, users_table
from lambdas.common.errors import (
    ConflictError,
    UnauthorizedError,
    ValidationError,
    handle_errors,
)
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    iso_now,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "auth_update_username"
USERNAME_RE = re.compile(r"^[A-Za-z0-9_\-\.]{2,20}$")


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    user_id = ctx.get("userId")
    email = ctx.get("email")
    if not user_id or not email:
        raise UnauthorizedError()

    body = parse_body(event)
    require_fields(body, "username")
    new_username = str(body["username"]).strip()

    if not USERNAME_RE.match(new_username):
        raise ValidationError("Username must be 2–20 chars: letters, digits, _ - .", field="username")
    if new_username.lower() in RESERVED_USERNAMES:
        raise ValidationError("That username is reserved", field="username")

    # If unchanged, return current state without write.
    current = users_table.get_item(Key={"email": email}).get("Item")
    if not current:
        raise UnauthorizedError("Account not found")
    if current.get("username") == new_username:
        return success_response({
            "id": current["id"],
            "email": current["email"],
            "username": current["username"],
            "is_admin": bool(current.get("is_admin", False)),
        })

    # Uniqueness check via the username GSI.
    taken = query_all(
        users_table,
        IndexName=USERS_USERNAME_INDEX,
        KeyConditionExpression=Key("username").eq(new_username),
        Limit=1,
    )
    if taken:
        raise ConflictError("Username taken — pick another")

    users_table.update_item(
        Key={"email": email},
        UpdateExpression="SET username = :u, updated_at = :t",
        ExpressionAttributeValues={":u": new_username, ":t": iso_now()},
    )

    return success_response({
        "id": current["id"],
        "email": current["email"],
        "username": new_username,
        "is_admin": bool(current.get("is_admin", False)),
    })

"""API Gateway request authorizer.

Authentication sources, in priority order:
- `Authorization: Bearer <jwt>` header (mobile / API clients)
- `derby_session` cookie (browser; set by /auth/verify)

On success returns an Allow policy with `userId`, `email`, `username`, `isAdmin`
in the requestContext.authorizer block, accessible to downstream handlers.
"""

from __future__ import annotations

from boto3.dynamodb.conditions import Key

from lambdas.common.auth_helpers import decode_session_jwt
from lambdas.common.constants import PRODUCT, USERS_ID_INDEX
from lambdas.common.dynamo_helpers import users_table, query_all
from lambdas.common.logger import get_logger

log = get_logger(__file__)
HANDLER = "authorizer"


def _generate_policy(effect: str, resource: str, context: dict | None = None) -> dict:
    policy = {
        "principalId": context.get("userId", PRODUCT) if context else PRODUCT,
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [{"Action": "execute-api:Invoke", "Effect": effect, "Resource": resource}],
        },
    }
    if context:
        # API Gateway only allows scalar values in context.
        policy["context"] = {k: str(v).lower() if isinstance(v, bool) else str(v) for k, v in context.items()}
    return policy


def _extract_token(event: dict) -> str | None:
    headers = {(k.lower() if k else k): v for k, v in (event.get("headers") or {}).items()}
    auth = headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth[7:].strip() or None
    cookie = headers.get("cookie") or ""
    for part in cookie.split(";"):
        if "=" not in part:
            continue
        k, v = part.strip().split("=", 1)
        if k == "derby_session":
            return v
    return None


def _user_by_id(user_id: str) -> dict | None:
    rows = query_all(
        users_table,
        IndexName=USERS_ID_INDEX,
        KeyConditionExpression=Key("id").eq(user_id),
        Limit=1,
    )
    return rows[0] if rows else None


def handler(event, context):
    method_arn = event.get("methodArn", "*")
    token = _extract_token(event)
    if not token:
        log.info("authorizer: no token")
        return _generate_policy("Deny", method_arn)

    try:
        user_id = decode_session_jwt(token)
    except Exception as e:
        log.info("authorizer: token decode failed: %s", e)
        return _generate_policy("Deny", method_arn)

    user = _user_by_id(user_id)
    if not user:
        log.info("authorizer: user not found: %s", user_id)
        return _generate_policy("Deny", method_arn)

    return _generate_policy(
        "Allow",
        method_arn,
        context={
            "userId": user["id"],
            "email": user["email"],
            "username": user["username"],
            "isAdmin": bool(user.get("is_admin", False)),
        },
    )

"""POST /auth/request-link — send a magic-link sign-in email."""

from __future__ import annotations

import time

from boto3.dynamodb.conditions import Attr, Key

from lambdas.common.auth_helpers import make_magic_token
from lambdas.common.constants import APP_BASE_URL, MAGIC_LINK_EMAIL_INDEX
from lambdas.common.dynamo_helpers import magic_link_table, query_all
from lambdas.common.errors import RateLimitError, ValidationError, handle_errors
from lambdas.common.ses_helper import send_magic_link_email
from lambdas.common.utility_helpers import (
    iso_now,
    no_content,
    parse_body,
    require_fields,
    utcnow,
)

HANDLER = "auth_request_link"
RATE_LIMIT = 3
RATE_WINDOW_SECONDS = 15 * 60
TOKEN_TTL_SECONDS = 15 * 60


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    require_fields(body, "email")

    email = str(body["email"]).strip().lower()
    if "@" not in email or len(email) > 320:
        raise ValidationError("Enter a valid email", field="email")

    cutoff_iso = utcnow().isoformat()
    cutoff_threshold = (utcnow().timestamp() - RATE_WINDOW_SECONDS)

    recent = query_all(
        magic_link_table,
        IndexName=MAGIC_LINK_EMAIL_INDEX,
        KeyConditionExpression=Key("email").eq(email),
    )
    fresh = [r for r in recent if _ts(r.get("created_at")) >= cutoff_threshold]
    if len(fresh) >= RATE_LIMIT:
        raise RateLimitError("Too many sign-in attempts. Try again in a few minutes.")

    token = make_magic_token()
    now = utcnow()
    ttl_epoch = int(now.timestamp()) + TOKEN_TTL_SECONDS
    magic_link_table.put_item(
        Item={
            "token": token,
            "email": email,
            "created_at": now.isoformat(),
            "expires_at": ttl_epoch,
        }
    )

    link = f"{APP_BASE_URL.rstrip('/')}/auth/verify/?token={token}"
    send_magic_link_email(to=email, link=link)
    _ = cutoff_iso  # quiet
    return no_content()


def _ts(iso: str | None) -> float:
    if not iso:
        return 0.0
    try:
        from lambdas.common.utility_helpers import parse_iso

        return parse_iso(iso).timestamp()
    except Exception:
        return 0.0

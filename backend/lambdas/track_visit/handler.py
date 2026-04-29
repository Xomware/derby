"""POST /track/visit — log a page view from an authed visitor."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from lambdas.common.dynamo_helpers import visits_table
from lambdas.common.errors import UnauthorizedError, handle_errors
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    iso_now,
    no_content,
    parse_body,
)

HANDLER = "track_visit"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    user_id = ctx.get("userId")
    username = ctx.get("username") or "?"
    if not user_id:
        raise UnauthorizedError()

    body = parse_body(event)
    page = str(body.get("page") or "/").strip()[:120]
    referrer = str(body.get("referrer") or "")[:200] or None

    now = datetime.now(timezone.utc)
    visits_table.put_item(
        Item={
            "visit_id": str(uuid.uuid4()),
            "user_id": user_id,
            "username": username,
            "page": page,
            "referrer": referrer,
            "day": now.strftime("%Y-%m-%d"),
            "ts": now.isoformat(),
        }
    )
    _ = iso_now  # quiet
    return no_content()

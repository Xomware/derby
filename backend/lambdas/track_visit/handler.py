"""POST /track/visit — log an anonymous page view.

Body: {"username": "DOM", "page": "/derby"}
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from lambdas.common.dynamo_helpers import visits_table
from lambdas.common.errors import handle_errors
from lambdas.common.identity import canonicalize_username
from lambdas.common.utility_helpers import no_content, parse_body

HANDLER = "track_visit"


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    username = canonicalize_username(body.get("username"))

    page = str(body.get("page") or "/").strip()[:120]
    referrer = str(body.get("referrer") or "")[:200] or None

    now = datetime.now(timezone.utc)
    visits_table.put_item(
        Item={
            "visit_id": str(uuid.uuid4()),
            "user_id": username,  # anon-by-username; legacy field name kept for the GSI
            "username": username,
            "page": page,
            "referrer": referrer,
            "day": now.strftime("%Y-%m-%d"),
            "ts": now.isoformat(),
        }
    )
    return no_content()

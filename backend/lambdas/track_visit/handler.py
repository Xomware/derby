"""POST /track/visit — log an anonymous page view.

Body: {"username": "DOM", "page": "/derby"}

Captures source IP + User-Agent off the API Gateway request context so admins
can spot weird names trying to disguise themselves.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from lambdas.common.dynamo_helpers import visits_table
from lambdas.common.errors import handle_errors
from lambdas.common.identity import canonicalize_username
from lambdas.common.utility_helpers import get_headers, no_content, parse_body

HANDLER = "track_visit"


def _client_ip(event: dict) -> str | None:
    rc = event.get("requestContext") or {}
    identity = rc.get("identity") or {}
    ip = identity.get("sourceIp")
    if ip:
        return str(ip)
    headers = get_headers(event)
    fwd = headers.get("x-forwarded-for")
    if fwd:
        # Take the first hop — that's the actual client.
        return fwd.split(",")[0].strip()
    return None


def _user_agent(event: dict) -> str | None:
    headers = get_headers(event)
    ua = headers.get("user-agent")
    if not ua:
        return None
    return str(ua)[:300]


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    username = canonicalize_username(body.get("username"))

    page = str(body.get("page") or "/").strip()[:120]
    referrer = str(body.get("referrer") or "")[:200] or None

    now = datetime.now(timezone.utc)
    item = {
        "visit_id": str(uuid.uuid4()),
        "user_id": username,  # anon-by-username; legacy field name kept for the GSI
        "username": username,
        "page": page,
        "referrer": referrer,
        "day": now.strftime("%Y-%m-%d"),
        "ts": now.isoformat(),
    }
    ip = _client_ip(event)
    if ip:
        item["ip"] = ip
    ua = _user_agent(event)
    if ua:
        item["user_agent"] = ua

    visits_table.put_item(Item=item)
    return no_content()

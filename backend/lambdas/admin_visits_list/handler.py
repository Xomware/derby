"""GET /admin-visits/stats — page-view analytics for admins.

Query params:
- days (default 7) — how many days of history to summarise
- limit (default 50) — recent-visits cap
"""

from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone

from boto3.dynamodb.conditions import Key

from lambdas.common.constants import VISITS_DAY_INDEX
from lambdas.common.dynamo_helpers import query_all, visits_table
from lambdas.common.errors import ForbiddenError, handle_errors
from lambdas.common.utility_helpers import (
    get_authorizer_context,
    get_query_params,
    success_response,
)

HANDLER = "admin_visits_list"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    if ctx.get("isAdmin") != "true":
        raise ForbiddenError("Admin only")

    qp = get_query_params(event)
    days = max(1, min(int(qp.get("days") or 7), 30))
    limit = max(1, min(int(qp.get("limit") or 50), 500))

    today = datetime.now(timezone.utc).date()
    rows: list[dict] = []
    by_day: dict[str, int] = {}
    for offset in range(days):
        day = (today - timedelta(days=offset)).isoformat()
        page = query_all(
            visits_table,
            IndexName=VISITS_DAY_INDEX,
            KeyConditionExpression=Key("day").eq(day),
        )
        rows.extend(page)
        by_day[day] = len(page)

    rows.sort(key=lambda r: r.get("ts", ""), reverse=True)

    page_counts = Counter(r.get("page", "/") for r in rows).most_common(20)
    user_counts = Counter(r.get("username", "?") for r in rows).most_common(20)

    recent = [
        {
            "username": r.get("username"),
            "page": r.get("page"),
            "ts": r.get("ts"),
            "referrer": r.get("referrer"),
        }
        for r in rows[:limit]
    ]

    return success_response({
        "total_visits": len(rows),
        "unique_visitors": len({r.get("user_id") for r in rows}),
        "by_day": [{"day": d, "count": c} for d, c in sorted(by_day.items(), reverse=True)],
        "top_pages": [{"page": p, "count": c} for p, c in page_counts],
        "top_users": [{"username": u, "count": c} for u, c in user_counts],
        "recent": recent,
    })

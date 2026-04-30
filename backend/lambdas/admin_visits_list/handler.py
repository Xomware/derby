"""POST /admin-visits/stats — page-view analytics for admins.

Body:
  admin_token: "derbytime"
  days: int (default 7, capped to 30)
  limit: int (default 50, capped to 500)
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from boto3.dynamodb.conditions import Key

from lambdas.common.constants import ADMIN_TOKEN, VISITS_DAY_INDEX
from lambdas.common.dynamo_helpers import query_all, visits_table
from lambdas.common.errors import ForbiddenError, handle_errors
from lambdas.common.utility_helpers import parse_body, success_response

HANDLER = "admin_visits_list"


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    if not ADMIN_TOKEN or body.get("admin_token") != ADMIN_TOKEN:
        raise ForbiddenError("Bad admin password")

    days = max(1, min(int(body.get("days") or 7), 30))
    limit = max(1, min(int(body.get("limit") or 50), 500))

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

    per_user: dict[str, dict] = defaultdict(
        lambda: {"username": "", "total": 0, "pages": Counter(), "last_seen": ""}
    )
    for r in rows:
        username = r.get("username") or "?"
        slot = per_user[username]
        slot["username"] = username
        slot["total"] += 1
        slot["pages"][r.get("page", "/")] += 1
        ts = r.get("ts", "")
        if ts > slot["last_seen"]:
            slot["last_seen"] = ts

    user_breakdown = [
        {
            "username": v["username"],
            "total": v["total"],
            "last_seen": v["last_seen"] or None,
            "pages": [{"page": p, "count": c} for p, c in v["pages"].most_common(10)],
        }
        for v in sorted(per_user.values(), key=lambda v: v["total"], reverse=True)
    ]

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
        "unique_visitors": len({r.get("username") for r in rows}),
        "by_day": [{"day": d, "count": c} for d, c in sorted(by_day.items(), reverse=True)],
        "top_pages": [{"page": p, "count": c} for p, c in page_counts],
        "top_users": [{"username": u, "count": c} for u, c in user_counts],
        "user_breakdown": user_breakdown,
        "recent": recent,
    })

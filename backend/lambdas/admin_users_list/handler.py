"""GET /admin/users — full signup list."""

from __future__ import annotations

from collections import Counter

from lambdas.common.dynamo_helpers import scan_all, users_table, votes_table
from lambdas.common.errors import ForbiddenError, handle_errors
from lambdas.common.utility_helpers import get_authorizer_context, success_response

HANDLER = "admin_users_list"


@handle_errors(HANDLER)
def handler(event, context):
    ctx = get_authorizer_context(event)
    if ctx.get("isAdmin") != "true":
        raise ForbiddenError("Admin only")

    users = scan_all(users_table)
    votes = scan_all(votes_table)
    counts = Counter(v["user_id"] for v in votes)

    rows = sorted(users, key=lambda u: u.get("created_at", ""), reverse=True)
    return success_response([
        {
            "id": u["id"],
            "email": u["email"],
            "username": u["username"],
            "is_admin": bool(u.get("is_admin", False)),
            "created_at": u.get("created_at"),
            "last_login_at": u.get("last_login_at"),
            "vote_count": int(counts.get(u["id"], 0)),
        }
        for u in rows
    ])

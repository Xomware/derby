"""POST /admin-results/cron-runs — return the most recent cron summaries.

Body: {"admin_token": "derbytime", "limit": 50, "type": "odds_cron"}
"""

from __future__ import annotations

import json

from boto3.dynamodb.conditions import Key

from lambdas.common.constants import ADMIN_TOKEN, POLL_RUNS_TYPE_INDEX
from lambdas.common.dynamo_helpers import poll_runs_table, query_all
from lambdas.common.errors import ForbiddenError, handle_errors
from lambdas.common.utility_helpers import parse_body, success_response

HANDLER = "admin_cron_runs"


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    if not ADMIN_TOKEN or body.get("admin_token") != ADMIN_TOKEN:
        raise ForbiddenError("Bad admin password")

    limit = max(1, min(int(body.get("limit") or 50), 500))
    cron_type = (body.get("type") or "odds_cron").strip() or "odds_cron"

    items = query_all(
        poll_runs_table,
        IndexName=POLL_RUNS_TYPE_INDEX,
        KeyConditionExpression=Key("type").eq(cron_type),
        ScanIndexForward=False,
    )
    items = items[:limit]

    rows = []
    for r in items:
        summary_raw = r.get("summary") or "{}"
        try:
            summary = json.loads(summary_raw) if isinstance(summary_raw, str) else summary_raw
        except Exception:
            summary = {"raw": str(summary_raw)}
        rows.append({
            "id": r.get("id"),
            "ran_at": r.get("ran_at"),
            "type": r.get("type"),
            "summary": summary,
        })

    return success_response({"type": cron_type, "rows": rows})

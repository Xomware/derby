"""POST /admin-results/post-time — bump the race_post_time on every pick
for an event. Use when Churchill delays the race.

Body: {
  "admin_token": "...",
  "event_id": "2026-kentucky-derby",
  "race_post_time": "2026-05-02T19:20:00-04:00"
}
"""

from __future__ import annotations

import re
from datetime import datetime

from boto3.dynamodb.conditions import Key

from lambdas.common.constants import ADMIN_TOKEN, PICKS_EVENT_INDEX
from lambdas.common.dynamo_helpers import picks_table, query_all
from lambdas.common.errors import ForbiddenError, ValidationError, handle_errors
from lambdas.common.utility_helpers import (
    iso_now,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "admin_post_time"

ISO_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$")


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    require_fields(body, "admin_token", "event_id", "race_post_time")

    if not ADMIN_TOKEN or body.get("admin_token") != ADMIN_TOKEN:
        raise ForbiddenError("Bad admin password")

    event_id = str(body.get("event_id") or "").strip()
    new_iso = str(body.get("race_post_time") or "").strip()

    if not event_id:
        raise ValidationError("event_id required", field="event_id")
    if not ISO_RE.match(new_iso):
        raise ValidationError(
            "race_post_time must be ISO-8601 with offset (e.g. 2026-05-02T19:20:00-04:00)",
            field="race_post_time",
        )
    try:
        datetime.fromisoformat(new_iso)
    except Exception:
        raise ValidationError("race_post_time not parseable", field="race_post_time")

    items = query_all(
        picks_table,
        IndexName=PICKS_EVENT_INDEX,
        KeyConditionExpression=Key("event_id").eq(event_id),
    )

    now = iso_now()
    updated = 0
    for it in items:
        if it.get("race_post_time") == new_iso:
            continue
        try:
            picks_table.update_item(
                Key={"id": it["id"]},
                UpdateExpression="SET race_post_time = :t, updated_at = :n",
                ExpressionAttributeValues={":t": new_iso, ":n": now},
                ConditionExpression="attribute_exists(id)",
            )
            updated += 1
        except picks_table.meta.client.exceptions.ConditionalCheckFailedException:
            continue

    return success_response({
        "event_id": event_id,
        "race_post_time": new_iso,
        "updated": updated,
        "total": len(items),
    })

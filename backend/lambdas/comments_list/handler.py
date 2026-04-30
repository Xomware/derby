"""GET /comments/list?event_id=… — newest-first comments for an event."""

from __future__ import annotations

from lambdas.common.comments_data import (
    MAX_RETURN,
    list_comments_for_event,
    serialize_comment,
)
from lambdas.common.errors import ValidationError, handle_errors
from lambdas.common.utility_helpers import get_query_params, success_response

HANDLER = "comments_list"


@handle_errors(HANDLER)
def handler(event, context):
    qp = get_query_params(event)
    event_id = (qp.get("event_id") or "").strip()
    if not event_id:
        raise ValidationError("event_id is required", field="event_id")

    horse_id = (qp.get("horse_id") or "").strip() or None

    items = list_comments_for_event(event_id, horse_id=horse_id, limit=MAX_RETURN)
    return success_response({
        "event_id": event_id,
        "horse_id": horse_id,
        "comments": [serialize_comment(i) for i in items],
    })

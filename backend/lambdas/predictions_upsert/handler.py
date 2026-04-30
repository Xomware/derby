"""POST /predictions/upsert — anonymous-username pick submission.

Body: {"event_id", "username", "win", "place", "show", "long_shot"}

No auth — the username comes from the body and is canonicalized to upper-case.
Predictions lock at the event's main-race post time; once locked, this returns
409 Conflict.
"""

from __future__ import annotations

from lambdas.common.dynamo_helpers import predictions_table
from lambdas.common.errors import ConflictError, ValidationError, handle_errors
from lambdas.common.identity import canonicalize_username
from lambdas.common.predictions_data import (
    event_locked,
    serialize_prediction,
    validate_pick_fields,
)
from lambdas.common.utility_helpers import (
    iso_now,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "predictions_upsert"


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    require_fields(body, "event_id", "username")
    event_id = str(body["event_id"]).strip()
    if not event_id:
        raise ValidationError("event_id is required", field="event_id")

    username = canonicalize_username(body.get("username"))
    picks = validate_pick_fields(body)

    if event_locked(event_id):
        raise ConflictError("Predictions are locked — race has started")

    now = iso_now()
    existing = predictions_table.get_item(
        Key={"event_id": event_id, "username": username}
    ).get("Item")

    item = {
        "event_id": event_id,
        "username": username,
        **picks,
        "created_at": (existing or {}).get("created_at", now),
        "updated_at": now,
    }
    predictions_table.put_item(Item=item)
    return success_response(serialize_prediction(item))

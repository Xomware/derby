"""GET /predictions/list?event_id=…&username=… — return predictions for an event.

Until the event's main race posts off, only the caller's own prediction is
returned (`my`); `others` is empty + `others_count` reflects how many people
have entered. After the lock, `others` includes everyone but the caller.
"""

from __future__ import annotations

from lambdas.common.errors import ValidationError, handle_errors
from lambdas.common.identity import canonicalize_username
from lambdas.common.predictions_data import (
    event_locked,
    list_predictions_for_event,
    post_time_for_event,
    serialize_prediction,
)
from lambdas.common.utility_helpers import get_query_params, success_response

HANDLER = "predictions_list"


@handle_errors(HANDLER)
def handler(event, context):
    qp = get_query_params(event)
    event_id = (qp.get("event_id") or "").strip()
    if not event_id:
        raise ValidationError("event_id is required", field="event_id")

    raw_username = qp.get("username")
    me_canonical: str | None = None
    if raw_username:
        try:
            me_canonical = canonicalize_username(raw_username)
        except ValidationError:
            me_canonical = None

    locked = event_locked(event_id)
    items = list_predictions_for_event(event_id)
    serialized = [serialize_prediction(i) for i in items]

    my = next(
        (p for p in serialized if me_canonical and p["username"] == me_canonical),
        None,
    )
    others = [p for p in serialized if not me_canonical or p["username"] != me_canonical]

    return success_response({
        "event_id": event_id,
        "post_time": post_time_for_event(event_id),
        "locked": locked,
        "my": my,
        "others": others,
        "others_count": len(others),
    })

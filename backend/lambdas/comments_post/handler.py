"""POST /comments/post — anonymous-username comment.

Body: {"event_id", "username", "body"}
"""

from __future__ import annotations

from lambdas.common.comments_data import MAX_BODY_LEN, make_comment_id, serialize_comment
from lambdas.common.dynamo_helpers import comments_table
from lambdas.common.errors import ValidationError, handle_errors
from lambdas.common.identity import canonicalize_username
from lambdas.common.utility_helpers import (
    iso_now,
    parse_body,
    require_fields,
    success_response,
)

HANDLER = "comments_post"


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    require_fields(body, "event_id", "username", "body")

    event_id = str(body["event_id"]).strip()
    if not event_id:
        raise ValidationError("event_id is required", field="event_id")

    username = canonicalize_username(body.get("username"))

    text = str(body.get("body") or "").strip()
    if not text:
        raise ValidationError("Comment body is required", field="body")
    if len(text) > MAX_BODY_LEN:
        raise ValidationError(
            f"Comment is too long (max {MAX_BODY_LEN} chars)", field="body"
        )

    horse_id = str(body.get("horse_id") or "").strip() or None
    if horse_id and len(horse_id) > 64:
        raise ValidationError("horse_id too long", field="horse_id")

    item = {
        "event_id": event_id,
        "id": make_comment_id(),
        "username": username,
        "body": text,
        "created_at": iso_now(),
    }
    if horse_id:
        item["horse_id"] = horse_id
    comments_table.put_item(Item=item)
    return success_response(serialize_comment(item), status=201)

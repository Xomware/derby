"""POST /comments/delete — delete your own comment.

Body: {"event_id", "id", "username"}

The caller asserts ownership via username; the backend reads the stored
comment and rejects with 403 if the username on the row doesn't match.
"""

from __future__ import annotations

from lambdas.common.dynamo_helpers import comments_table
from lambdas.common.errors import (
    ForbiddenError,
    NotFoundError,
    ValidationError,
    handle_errors,
)
from lambdas.common.identity import canonicalize_username
from lambdas.common.utility_helpers import (
    no_content,
    parse_body,
    require_fields,
)

HANDLER = "comments_delete"


@handle_errors(HANDLER)
def handler(event, context):
    body = parse_body(event)
    require_fields(body, "event_id", "id", "username")

    event_id = str(body["event_id"]).strip()
    comment_id = str(body["id"]).strip()
    if not event_id or not comment_id:
        raise ValidationError("event_id and id are required")

    username = canonicalize_username(body.get("username"))

    existing = comments_table.get_item(
        Key={"event_id": event_id, "id": comment_id}
    ).get("Item")
    if not existing:
        raise NotFoundError("Comment not found")
    if (existing.get("username") or "").upper() != username:
        raise ForbiddenError("You can only delete your own comments")

    comments_table.delete_item(Key={"event_id": event_id, "id": comment_id})
    return no_content()

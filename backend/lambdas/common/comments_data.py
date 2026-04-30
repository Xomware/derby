"""Helpers for the comments table."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from boto3.dynamodb.conditions import Key

from lambdas.common.dynamo_helpers import comments_table, query_all

MAX_BODY_LEN = 280
MAX_RETURN = 200


def make_comment_id(now: datetime | None = None) -> str:
    """Lex-sortable id: `<isoUTC>#<short-uuid>`."""
    n = now or datetime.now(timezone.utc)
    return f"{n.isoformat()}#{uuid.uuid4().hex[:8]}"


def serialize_comment(item: dict) -> dict:
    return {
        "id": item.get("id"),
        "event_id": item.get("event_id"),
        "username": item.get("username"),
        "body": item.get("body"),
        "created_at": item.get("created_at"),
    }


def list_comments_for_event(event_id: str, limit: int = MAX_RETURN) -> list[dict]:
    items = query_all(
        comments_table,
        KeyConditionExpression=Key("event_id").eq(event_id),
        ScanIndexForward=False,
    )
    return items[:limit]

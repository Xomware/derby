"""Shared helpers for predictions (top-3 + long shot) — server-side game state."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any

from boto3.dynamodb.conditions import Key

from lambdas.common.constants import EVENT_MAIN_RACES
from lambdas.common.dynamo_helpers import predictions_table, query_all
from lambdas.common.errors import ValidationError
from lambdas.common.schedule import SCHEDULE


PREDICTION_FIELDS = ("win", "place", "show", "long_shot")


def _slug_from_event_id(event_id: str) -> str:
    """`2026-kentucky-derby` -> `kentucky-derby`."""
    parts = event_id.split("-", 1)
    return parts[1] if len(parts) == 2 else event_id


def _day_for_event(event_id: str) -> str:
    slug = _slug_from_event_id(event_id)
    return "derby" if "derby" in slug else "oaks"


def post_time_for_event(event_id: str) -> str | None:
    """Return ISO post time for the *main* race of the given event_id, or None."""
    slug = _slug_from_event_id(event_id)
    main_race = EVENT_MAIN_RACES.get(slug)
    if main_race is None:
        return None
    day = _day_for_event(event_id)
    for slot in SCHEDULE:
        if slot["day"] == day and slot["race_number"] == main_race:
            return slot["post_time"]
    return None


def event_locked(event_id: str, now: datetime | None = None) -> bool:
    """True iff the event's main race post time has passed."""
    iso = post_time_for_event(event_id)
    if not iso:
        return False
    target = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    n = now or datetime.now(timezone.utc)
    return n >= target


def validate_pick_fields(body: dict) -> dict[str, str]:
    """Pull win/place/show/long_shot out of the body. All required, all strings."""
    out: dict[str, str] = {}
    for f in PREDICTION_FIELDS:
        v = body.get(f)
        if not v or not isinstance(v, str):
            raise ValidationError(f"`{f}` is required", field=f)
        cleaned = v.strip()
        if not 1 <= len(cleaned) <= 80:
            raise ValidationError(f"`{f}` must be 1–80 chars", field=f)
        out[f] = cleaned
    # Disallow duplicates between win/place/show — long_shot can repeat (it's a flier).
    top3 = [out["win"], out["place"], out["show"]]
    if len(set(top3)) != 3:
        raise ValidationError("Win / Place / Show must be three different horses")
    return out


def serialize_prediction(item: dict) -> dict[str, Any]:
    """Strip Decimals and shape an item for the API response."""
    return {
        "event_id": item.get("event_id"),
        "username": item.get("username"),
        "win": item.get("win"),
        "place": item.get("place"),
        "show": item.get("show"),
        "long_shot": item.get("long_shot"),
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
    }


def list_predictions_for_event(event_id: str) -> list[dict]:
    return query_all(
        predictions_table,
        KeyConditionExpression=Key("event_id").eq(event_id),
    )

"""DynamoDB read helpers for picks + votes — used by multiple handlers."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from decimal import Decimal
from typing import Any

from boto3.dynamodb.conditions import Key

from lambdas.common.constants import EVENT_ID, EVENT_NAME, PICKS_EVENT_INDEX, VOTES_USER_INDEX
from lambdas.common.dynamo_helpers import picks_table, votes_table, query_all
from lambdas.common.utility_helpers import parse_iso, utcnow


def _to_int(v: Any) -> int:
    if isinstance(v, Decimal):
        return int(v)
    return int(v) if v is not None else 0


def _to_str_or_none(v: Any) -> str | None:
    if v in (None, ""):
        return None
    return str(v)


def is_locked(race_post_time_iso: str, now: datetime | None = None) -> bool:
    now = now or utcnow()
    return now >= parse_iso(race_post_time_iso)


def list_picks_for_event(event_id: str = EVENT_ID) -> list[dict]:
    return query_all(
        picks_table,
        IndexName=PICKS_EVENT_INDEX,
        KeyConditionExpression=Key("event_id").eq(event_id),
    )


def votes_for_picks(pick_ids: list[str]) -> list[dict]:
    if not pick_ids:
        return []
    rows: list[dict] = []
    for pid in pick_ids:
        rows.extend(
            query_all(
                votes_table,
                KeyConditionExpression=Key("pick_id").eq(pid),
            )
        )
    return rows


def votes_for_user(user_id: str) -> list[dict]:
    return query_all(
        votes_table,
        IndexName=VOTES_USER_INDEX,
        KeyConditionExpression=Key("user_id").eq(user_id),
    )


def serialize_pick(pick: dict, votes: list[dict], usernames_by_user_id: dict[str, str], current_user_id: str | None) -> dict:
    counts = {"tail": 0, "fade": 0, "pass": 0}
    voters: dict[str, list[dict]] = {"tail": [], "fade": [], "pass": []}
    my_vote = None
    for v in votes:
        vote = v["vote"]
        counts[vote] = counts.get(vote, 0) + 1
        username = usernames_by_user_id.get(v["user_id"], "?")
        voters[vote].append({"username": username})
        if current_user_id and v["user_id"] == current_user_id:
            my_vote = vote

    rpt = pick["race_post_time"]
    return {
        "id": pick["id"],
        "event_id": pick["event_id"],
        "race_number": _to_int(pick["race_number"]),
        "race_post_time": rpt,
        "horse_name": pick["horse_name"],
        "post_position": _to_int(pick.get("post_position")) if pick.get("post_position") not in (None, "") else None,
        "jockey": _to_str_or_none(pick.get("jockey")),
        "trainer": _to_str_or_none(pick.get("trainer")),
        "odds_at_pick": _to_str_or_none(pick.get("odds_at_pick")),
        "confidence": _to_int(pick.get("confidence", 3)),
        "writeup": _to_str_or_none(pick.get("writeup")),
        "result": pick.get("result", "pending"),
        "display_order": _to_int(pick.get("display_order", 0)),
        "locked": is_locked(rpt),
        "counts": counts,
        "voters": voters,
        "my_vote": my_vote,
    }


def picks_grouped_by_race(picks: list[dict], votes: list[dict], usernames_by_user_id: dict[str, str], current_user_id: str | None) -> dict:
    by_pick: dict[str, list[dict]] = defaultdict(list)
    for v in votes:
        by_pick[v["pick_id"]].append(v)

    serialized = [
        serialize_pick(p, by_pick.get(p["id"], []), usernames_by_user_id, current_user_id)
        for p in picks
    ]
    serialized.sort(key=lambda p: (p["race_number"], p["display_order"], p["horse_name"]))

    races_map: dict[int, dict] = {}
    for p in serialized:
        r = races_map.setdefault(
            p["race_number"],
            {
                "race_number": p["race_number"],
                "race_post_time": p["race_post_time"],
                "locked": p["locked"],
                "picks": [],
            },
        )
        r["picks"].append(p)

    races = [races_map[k] for k in sorted(races_map.keys())]
    return {
        "event": {"id": EVENT_ID, "name": EVENT_NAME, "is_active": True},
        "races": races,
    }

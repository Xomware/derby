"""Seed each Derby/Oaks pick with a starting odds_history entry so the
sparkline has somewhere to grow from. Skips rows that already have history.

    python3 backend/scripts/seed_odds_history.py
"""

from __future__ import annotations

from datetime import datetime, timezone

import boto3

dynamo = boto3.resource("dynamodb")
PICKS = dynamo.Table("derby-picks")

EVENTS = ("2026-kentucky-derby", "2026-kentucky-oaks")


def query_event(event_id: str) -> list[dict]:
    out: list[dict] = []
    kwargs: dict = {
        "IndexName": "event-index",
        "KeyConditionExpression": "event_id = :e",
        "ExpressionAttributeValues": {":e": event_id},
    }
    while True:
        resp = PICKS.query(**kwargs)
        out.extend(resp.get("Items", []))
        lk = resp.get("LastEvaluatedKey")
        if not lk:
            break
        kwargs["ExclusiveStartKey"] = lk
    return out


def main() -> None:
    now = datetime.now(timezone.utc).isoformat()
    seeded = 0
    skipped = 0
    for ev in EVENTS:
        for it in query_event(ev):
            if it.get("odds_history"):
                skipped += 1
                continue
            odds = it.get("odds_at_pick")
            if not odds:
                skipped += 1
                continue
            ts = it.get("odds_updated_at") or now
            PICKS.update_item(
                Key={"id": it["id"]},
                UpdateExpression="SET odds_history = :h",
                ExpressionAttributeValues={
                    ":h": [{"ts": str(ts), "odds": str(odds)}]
                },
            )
            seeded += 1
            print(f"[seed] {ev} :: {it['horse_name']} = {odds} @ {ts}")
    print(f"\nSeeded {seeded}, skipped {skipped}.")


if __name__ == "__main__":
    main()

"""Strip literal 'N/A' strings from picks rows so the UI renders them as
the standard 'N/A' fallback (the column is treated as missing instead of
the literal string getting echoed). Idempotent.

    python3 backend/scripts/clear_na.py
"""

from __future__ import annotations

import boto3

dynamo = boto3.resource("dynamodb")
PICKS = dynamo.Table("derby-picks")

EVENTS = ("2026-kentucky-derby", "2026-kentucky-oaks")
FIELDS = ("beyer", "brisnet", "equibase_rating", "record", "style", "last_race")


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
    for ev in EVENTS:
        for it in query_event(ev):
            removes = [
                f for f in FIELDS
                if isinstance(it.get(f), str)
                and it[f].strip().upper() == "N/A"
            ]
            if not removes:
                continue
            PICKS.update_item(
                Key={"id": it["id"]},
                UpdateExpression="REMOVE " + ", ".join(f"#{f}" for f in removes),
                ExpressionAttributeNames={f"#{f}": f for f in removes},
            )
            print(f"[ok] {ev} :: {it['horse_name']} cleared {removes}")


if __name__ == "__main__":
    main()

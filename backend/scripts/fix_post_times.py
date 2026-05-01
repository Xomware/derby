"""Repoint Oaks/Derby picks to the real 2026 marquee post times.

Source of truth is backend/lambdas/common/schedule.py, where Race 11
(Oaks) is 17:51 ET 2026-05-01 and Race 12 (Derby) is 18:57 ET
2026-05-02. The picks-*.json seed files were 5h late at 22:51/22:57.
This script fixes any DDB rows still carrying the wrong times.
"""

from __future__ import annotations

import boto3

dynamo = boto3.resource("dynamodb")
PICKS = dynamo.Table("derby-picks")

CORRECTIONS = {
    "2026-kentucky-oaks": "2026-05-01T20:40:00-04:00",
    "2026-kentucky-derby": "2026-05-02T18:57:00-04:00",
}


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
    for event_id, correct_iso in CORRECTIONS.items():
        items = query_event(event_id)
        fixed = 0
        for it in items:
            if it.get("race_post_time") == correct_iso:
                continue
            PICKS.update_item(
                Key={"id": it["id"]},
                UpdateExpression="SET race_post_time = :t",
                ExpressionAttributeValues={":t": correct_iso},
            )
            fixed += 1
        print(f"[{event_id}] fixed {fixed} rows -> {correct_iso}")


if __name__ == "__main__":
    main()

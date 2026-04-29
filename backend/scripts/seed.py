"""Seed temp 2026 Derby picks into DynamoDB. Run locally with AWS creds set.

Usage:
    cd backend
    python scripts/seed.py
"""

from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timezone

# Make `lambdas.*` imports resolve when run from backend/ directly.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import boto3

EVENT_ID = "2026-kentucky-derby"
DERBY_POST = datetime(2026, 5, 2, 22, 57, tzinfo=timezone.utc)

PICKS = [
    {
        "race_number": 12,
        "horse_name": "Bourbon Sunrise",
        "post_position": 5,
        "jockey": "TBD Jockey",
        "trainer": "TBD Trainer",
        "odds_at_pick": "8/1",
        "confidence": 4,
        "writeup": "Closer with a wide turn — stalks pace and finishes hard. Sun God says ride.",
        "display_order": 0,
    },
    {
        "race_number": 12,
        "horse_name": "Mint Julep Magic",
        "post_position": 11,
        "jockey": "TBD Jockey",
        "trainer": "TBD Trainer",
        "odds_at_pick": "12/1",
        "confidence": 3,
        "writeup": "Live longshot. If pace collapses, this one comes flying.",
        "display_order": 1,
    },
    {
        "race_number": 12,
        "horse_name": "Garland Dreamer",
        "post_position": 3,
        "jockey": "TBD Jockey",
        "trainer": "TBD Trainer",
        "odds_at_pick": "5/1",
        "confidence": 5,
        "writeup": "Top of the ticket. Tactical speed, smart pilot, training sharp.",
        "display_order": 2,
    },
]


def main() -> None:
    region = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
    table_name = os.environ.get("PICKS_TABLE", "derby-picks")
    table = boto3.resource("dynamodb", region_name=region).Table(table_name)

    now = datetime.now(timezone.utc).isoformat()
    inserted = 0
    for p in PICKS:
        item = {
            "id": str(uuid.uuid4()),
            "event_id": EVENT_ID,
            "race_post_time": DERBY_POST.isoformat(),
            "result": "pending",
            "created_at": now,
            "updated_at": now,
            **p,
        }
        table.put_item(Item=item)
        inserted += 1
    print(f"Inserted {inserted} picks into {table_name}")


if __name__ == "__main__":
    main()

"""Upload Grant's picks + rationale to DynamoDB from a JSON file.

Usage:
    cd backend
    python scripts/upload_picks.py path/to/picks.json
    python scripts/upload_picks.py path/to/picks.json --clear-existing
    python scripts/upload_picks.py path/to/picks.json --dry-run

JSON format:
    {
      "event_id": "2026-kentucky-derby",
      "event_name": "2026 Kentucky Derby",
      "picks": [
        {
          "race_number": 12,
          "race_post_time": "2026-05-02T22:57:00-04:00",
          "horse_name": "Bourbon Sunrise",
          "post_position": 5,
          "jockey": "...",
          "trainer": "...",
          "odds_at_pick": "8/1",
          "confidence": 4,
          "display_order": 0,
          "writeup": "Multi-line\\ntext is fine."
        }
      ]
    }

Upsert rules: matched on (event_id, race_number, horse_name). Existing picks
keep their id (so user votes survive). New picks get a fresh UUID.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

import boto3
from boto3.dynamodb.conditions import Key

REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
PICKS_TABLE = os.environ.get("PICKS_TABLE", "derby-picks")
PICKS_EVENT_INDEX = "event-index"

REQUIRED_FIELDS = ("race_number", "race_post_time", "horse_name")
OPTIONAL_FIELDS = (
    "post_position",
    "jockey",
    "trainer",
    "odds_at_pick",
    "confidence",
    "writeup",
    "display_order",
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Upload Sun God Derby picks to DynamoDB")
    p.add_argument("file", help="Path to a picks JSON file")
    p.add_argument(
        "--clear-existing",
        action="store_true",
        help="Delete every existing pick for this event before inserting new ones",
    )
    p.add_argument("--dry-run", action="store_true", help="Validate input but don't write")
    return p.parse_args()


def load_picks(path: Path) -> tuple[str, list[dict]]:
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    event_id = data.get("event_id")
    if not event_id or not isinstance(event_id, str):
        raise ValueError("Missing top-level 'event_id' (string)")
    raw_picks = data.get("picks") or []
    if not isinstance(raw_picks, list) or not raw_picks:
        raise ValueError("'picks' must be a non-empty list")
    return event_id, raw_picks


def validate(pick: dict, idx: int) -> dict:
    for field in REQUIRED_FIELDS:
        if pick.get(field) in (None, ""):
            raise ValueError(f"pick[{idx}]: missing {field}")

    race_number = int(pick["race_number"])
    if not 1 <= race_number <= 20:
        raise ValueError(f"pick[{idx}]: race_number must be 1..20")

    # Verify race_post_time parses as ISO 8601.
    rpt = str(pick["race_post_time"])
    try:
        datetime.fromisoformat(rpt.replace("Z", "+00:00"))
    except ValueError:
        raise ValueError(f"pick[{idx}]: race_post_time '{rpt}' is not ISO 8601")

    confidence = int(pick.get("confidence", 3))
    if not 1 <= confidence <= 5:
        raise ValueError(f"pick[{idx}]: confidence must be 1..5")

    out = {
        "race_number": race_number,
        "race_post_time": rpt,
        "horse_name": str(pick["horse_name"]).strip(),
        "confidence": confidence,
        "display_order": int(pick.get("display_order", 0)),
    }
    for field in ("post_position",):
        if pick.get(field) not in (None, ""):
            out[field] = int(pick[field])
    for field in (
        "jockey",
        "trainer",
        "odds_at_pick",
        "writeup",
        "final_take",
        "record",
        "beyer",
        "brisnet",
        "equibase_rating",
        "last_race",
        "style",
    ):
        if pick.get(field) not in (None, ""):
            out[field] = str(pick[field])
    return out


def main() -> int:
    args = parse_args()
    path = Path(args.file)
    if not path.exists():
        print(f"file not found: {path}", file=sys.stderr)
        return 1

    event_id, raw_picks = load_picks(path)
    print(f"Event: {event_id}")
    print(f"Loaded {len(raw_picks)} pick(s) from {path}")

    validated = [validate(p, i) for i, p in enumerate(raw_picks)]

    if args.dry_run:
        print("dry-run — no DynamoDB writes")
        for p in validated:
            print(f"  R{p['race_number']:>2} {p['horse_name']!r:30} conf={p['confidence']}")
        return 0

    table = boto3.resource("dynamodb", region_name=REGION).Table(PICKS_TABLE)

    existing = _fetch_existing(table, event_id)
    by_key = {(int(p["race_number"]), p["horse_name"]): p for p in existing}

    if args.clear_existing:
        print(f"Clearing {len(existing)} existing pick(s)…")
        with table.batch_writer() as batch:
            for p in existing:
                batch.delete_item(Key={"id": p["id"]})
        by_key = {}

    now = datetime.now(timezone.utc).isoformat()
    created = updated = 0
    with table.batch_writer() as batch:
        for p in validated:
            key = (p["race_number"], p["horse_name"])
            existing_pick = by_key.get(key)
            pick_id = existing_pick["id"] if existing_pick else str(uuid.uuid4())
            item = {
                "id": pick_id,
                "event_id": event_id,
                "result": existing_pick.get("result", "pending") if existing_pick else "pending",
                "created_at": existing_pick.get("created_at", now) if existing_pick else now,
                "updated_at": now,
                **p,
            }
            batch.put_item(Item=item)
            if existing_pick:
                updated += 1
            else:
                created += 1

    print(f"Created {created} pick(s), updated {updated} pick(s).")
    return 0


def _fetch_existing(table, event_id: str) -> list[dict]:
    items: list[dict] = []
    last = None
    while True:
        kwargs = {
            "IndexName": PICKS_EVENT_INDEX,
            "KeyConditionExpression": Key("event_id").eq(event_id),
        }
        if last:
            kwargs["ExclusiveStartKey"] = last
        page = table.query(**kwargs)
        items.extend(page.get("Items") or [])
        last = page.get("LastEvaluatedKey")
        if not last:
            break
    return items


if __name__ == "__main__":
    sys.exit(main())

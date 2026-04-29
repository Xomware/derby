"""Seed temp data for the 2026 Kentucky Derby. Replace with Grant's real picks before launch.

Usage:
  python -m app.scripts.seed
"""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import select

from app.db import SessionLocal
from app.models import Event, Pick

# 2026 Derby is May 2. Post time roughly 6:57pm ET (22:57 UTC).
DERBY_DATE = date(2026, 5, 2)
DERBY_POST = datetime(2026, 5, 2, 22, 57, tzinfo=timezone.utc)

# Temp picks — placeholder horses/jockeys/trainers, plain writeups.
TEMP_PICKS = [
    {
        "race_number": 12,
        "race_post_time": DERBY_POST,
        "horse_name": "Bourbon Sunrise",
        "post_position": 5,
        "jockey": "TBD Jockey",
        "trainer": "TBD Trainer",
        "odds_at_pick": "8/1",
        "confidence": 4,
        "writeup": "Closer with a wide turn — stalks pace and finishes hard. The Sun Oracle has spoken.",
        "display_order": 0,
    },
    {
        "race_number": 12,
        "race_post_time": DERBY_POST,
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
        "race_post_time": DERBY_POST,
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


def seed() -> None:
    with SessionLocal() as db:
        event = db.scalar(select(Event).where(Event.is_active.is_(True)))
        if not event:
            event = Event(name="2026 Kentucky Derby", event_date=DERBY_DATE, is_active=True)
            db.add(event)
            db.flush()
        else:
            print(f"Active event already exists: {event.name}")

        existing = {(p.race_number, p.horse_name) for p in event.picks}
        for p in TEMP_PICKS:
            key = (p["race_number"], p["horse_name"])
            if key in existing:
                continue
            db.add(Pick(event_id=event.id, **p))
        db.commit()
        print(f"Seeded {event.name} with {len(TEMP_PICKS)} temp picks (skipped duplicates).")


if __name__ == "__main__":
    seed()

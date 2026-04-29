from __future__ import annotations

import uuid
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import Event, Pick, User, Vote
from app.schemas import (
    EventOut,
    PickOut,
    PicksGroupedOut,
    RaceGroup,
    VoteCounts,
    VoterOut,
)


def get_active_event(db: Session) -> Event | None:
    return db.scalar(select(Event).where(Event.is_active.is_(True)).order_by(Event.event_date.desc()))


def is_locked(race_post_time: datetime, now: datetime | None = None) -> bool:
    now = now or datetime.now(timezone.utc)
    return now >= race_post_time


def picks_for_event_grouped(db: Session, event: Event, current_user: User | None) -> PicksGroupedOut:
    picks = db.scalars(
        select(Pick)
        .where(Pick.event_id == event.id)
        .order_by(Pick.race_number, Pick.display_order, Pick.created_at)
        .options(selectinload(Pick.votes).selectinload(Vote.user))
    ).all()

    now = datetime.now(timezone.utc)
    by_race: dict[int, list[PickOut]] = defaultdict(list)
    race_post_times: dict[int, datetime] = {}

    for pick in picks:
        counts = VoteCounts()
        voters: dict[str, list[VoterOut]] = {"tail": [], "fade": [], "pass": []}
        my_vote = None
        for v in pick.votes:
            if v.vote == "tail":
                counts.tail += 1
            elif v.vote == "fade":
                counts.fade += 1
            elif v.vote == "pass":
                counts.pass_ += 1
            voters[v.vote].append(VoterOut(username=v.user.username))
            if current_user and v.user_id == current_user.id:
                my_vote = v.vote  # type: ignore[assignment]

        race_post_times[pick.race_number] = pick.race_post_time
        by_race[pick.race_number].append(
            PickOut(
                id=pick.id,
                event_id=pick.event_id,
                race_number=pick.race_number,
                race_post_time=pick.race_post_time,
                horse_name=pick.horse_name,
                post_position=pick.post_position,
                jockey=pick.jockey,
                trainer=pick.trainer,
                odds_at_pick=pick.odds_at_pick,
                confidence=pick.confidence,
                writeup=pick.writeup,
                result=pick.result,  # type: ignore[arg-type]
                display_order=pick.display_order,
                locked=is_locked(pick.race_post_time, now),
                counts=counts,
                voters=voters,
                my_vote=my_vote,
            )
        )

    races: list[RaceGroup] = []
    for race_number in sorted(by_race.keys()):
        rpt = race_post_times[race_number]
        races.append(
            RaceGroup(
                race_number=race_number,
                race_post_time=rpt,
                locked=is_locked(rpt, now),
                picks=by_race[race_number],
            )
        )

    return PicksGroupedOut(event=EventOut.model_validate(event), races=races)


def get_pick(db: Session, pick_id: uuid.UUID) -> Pick | None:
    return db.get(Pick, pick_id)

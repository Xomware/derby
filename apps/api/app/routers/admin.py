from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_admin
from app.models import Event, Pick, PollRun, User, Vote
from app.schemas import (
    AdminUserOut,
    PickIn,
    PickOut,
    PickResultUpdate,
    PickUpdate,
    PollStatusOut,
)
from app.services.picks_service import get_active_event, picks_for_event_grouped

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(get_current_admin)])


def _require_event(db: Session) -> Event:
    event = get_active_event(db)
    if not event:
        raise HTTPException(status_code=400, detail="No active event configured")
    return event


def _pick_to_out(db: Session, pick: Pick) -> PickOut:
    grouped = picks_for_event_grouped(db, pick.event, current_user=None)
    for race in grouped.races:
        for p in race.picks:
            if p.id == pick.id:
                return p
    raise HTTPException(status_code=404, detail="Pick not found in event")


@router.post("/picks", response_model=PickOut, status_code=status.HTTP_201_CREATED)
def create_pick(payload: PickIn, db: Session = Depends(get_db)) -> PickOut:
    event = _require_event(db)
    pick = Pick(event_id=event.id, **payload.model_dump())
    db.add(pick)
    db.commit()
    db.refresh(pick)
    return _pick_to_out(db, pick)


@router.patch("/picks/{pick_id}", response_model=PickOut)
def update_pick(pick_id: uuid.UUID, payload: PickUpdate, db: Session = Depends(get_db)) -> PickOut:
    pick = db.get(Pick, pick_id)
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(pick, k, v)
    db.commit()
    db.refresh(pick)
    return _pick_to_out(db, pick)


@router.delete("/picks/{pick_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pick(pick_id: uuid.UUID, db: Session = Depends(get_db)) -> None:
    pick = db.get(Pick, pick_id)
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    db.delete(pick)
    db.commit()


@router.patch("/picks/{pick_id}/result", response_model=PickOut)
def override_result(pick_id: uuid.UUID, payload: PickResultUpdate, db: Session = Depends(get_db)) -> PickOut:
    pick = db.get(Pick, pick_id)
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    pick.result = payload.result
    db.commit()
    db.refresh(pick)
    return _pick_to_out(db, pick)


@router.get("/users", response_model=list[AdminUserOut])
def list_users(db: Session = Depends(get_db)) -> list[AdminUserOut]:
    vote_counts = dict(
        db.execute(
            select(Vote.user_id, func.count(Vote.id)).group_by(Vote.user_id)
        ).all()
    )
    rows: list[AdminUserOut] = []
    for u in db.scalars(select(User).order_by(User.created_at.desc())).all():
        rows.append(
            AdminUserOut(
                id=u.id,
                email=u.email,
                username=u.username,
                is_admin=u.is_admin,
                created_at=u.created_at,
                last_login_at=u.last_login_at,
                vote_count=vote_counts.get(u.id, 0),
            )
        )
    return rows


@router.get("/poll-status", response_model=PollStatusOut)
def poll_status(db: Session = Depends(get_db)) -> PollStatusOut:
    from app.services.polling import get_next_run_at
    from app.config import get_settings

    last = db.scalar(select(PollRun).order_by(PollRun.ran_at.desc()))
    settings = get_settings()
    return PollStatusOut(
        last_ran_at=last.ran_at if last else None,
        last_source=last.source if last else None,
        last_picks_updated=last.picks_updated if last else None,
        last_errors=last.errors if last else None,
        poll_enabled=settings.poll_enabled,
        next_run_at=get_next_run_at(),
    )


@router.post("/poll-now")
def poll_now(db: Session = Depends(get_db)) -> dict:
    from app.services.polling import run_poll_once

    summary = run_poll_once(db)
    return summary

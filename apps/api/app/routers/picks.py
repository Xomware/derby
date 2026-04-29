from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.deps import get_current_user_optional
from app.models import User
from app.schemas import PickOut, PicksGroupedOut
from app.services.picks_service import (
    get_active_event,
    get_pick,
    picks_for_event_grouped,
)

router = APIRouter(prefix="/picks", tags=["picks"])


@router.get("", response_model=PicksGroupedOut)
def list_picks(
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> PicksGroupedOut:
    event = get_active_event(db)
    if not event:
        raise HTTPException(status_code=404, detail="No active event configured")
    return picks_for_event_grouped(db, event, user)


@router.get("/{pick_id}", response_model=PickOut)
def get_one(
    pick_id: uuid.UUID,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> PickOut:
    pick = get_pick(db, pick_id)
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    grouped = picks_for_event_grouped(db, pick.event, user)
    for race in grouped.races:
        for p in race.picks:
            if p.id == pick.id:
                return p
    raise HTTPException(status_code=404, detail="Pick not found")

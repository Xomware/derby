from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import utcnow
from app.db import get_db
from app.deps import get_current_user
from app.models import Pick, User, Vote
from app.schemas import VoteIn, VoteOut

router = APIRouter(tags=["votes"])


@router.post("/votes", response_model=VoteOut)
def upsert_vote(
    payload: VoteIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> VoteOut:
    pick = db.get(Pick, payload.pick_id)
    if not pick:
        raise HTTPException(status_code=404, detail="Pick not found")
    if utcnow() >= pick.race_post_time:
        raise HTTPException(status_code=423, detail="Voting is locked for this race")
    if pick.result == "scratched":
        raise HTTPException(status_code=409, detail="This pick was scratched")

    existing = db.scalar(select(Vote).where(Vote.user_id == user.id, Vote.pick_id == pick.id))
    if existing:
        existing.vote = payload.vote
        db.commit()
        db.refresh(existing)
        return VoteOut.model_validate(existing)

    vote = Vote(user_id=user.id, pick_id=pick.id, vote=payload.vote)
    db.add(vote)
    db.commit()
    db.refresh(vote)
    return VoteOut.model_validate(vote)


@router.get("/votes/me", response_model=list[VoteOut])
def my_votes(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[VoteOut]:
    rows = db.scalars(select(Vote).where(Vote.user_id == user.id)).all()
    return [VoteOut.model_validate(v) for v in rows]

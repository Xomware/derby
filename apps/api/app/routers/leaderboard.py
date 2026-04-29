from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas import LeaderboardOut
from app.services.leaderboard_service import compute_leaderboard

router = APIRouter(tags=["leaderboard"])


@router.get("/leaderboard", response_model=LeaderboardOut)
def leaderboard(db: Session = Depends(get_db)) -> LeaderboardOut:
    return compute_leaderboard(db)

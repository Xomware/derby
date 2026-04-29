"""Internal endpoints called by trusted background workers (e.g. GitHub Actions cron).

Authenticated by a shared secret in the X-Internal-Secret header.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.services.polling import run_poll_once

router = APIRouter(prefix="/internal", tags=["internal"])


def _check_secret(x_internal_secret: str | None) -> None:
    settings = get_settings()
    if not settings.internal_secret:
        raise HTTPException(status_code=503, detail="Internal endpoints disabled")
    if x_internal_secret != settings.internal_secret:
        raise HTTPException(status_code=403, detail="Forbidden")


@router.post("/poll")
def poll_tick(
    x_internal_secret: str | None = Header(default=None, alias="X-Internal-Secret"),
    db: Session = Depends(get_db),
) -> dict:
    _check_secret(x_internal_secret)
    return run_poll_once(db)

"""Race-results polling service.

Two providers wired in:
- "fake": no-op for local dev / pre-source-verified state.
- "churchill_downs": stub for the real scraper. Live source URL and parsing TBD on Day 1
  (Plan v2 open item). Falls back to recording an error so admin dashboard surfaces it.

The poll job runs only inside the configured race window. APScheduler is started in main.py.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Callable

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import SessionLocal
from app.models import Pick, PollRun

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _now() -> datetime:
    return datetime.now(timezone.utc)


def in_window(now: datetime | None = None) -> bool:
    settings = get_settings()
    if not settings.poll_enabled:
        return False
    now = now or _now()
    if settings.poll_window_start_utc and now < settings.poll_window_start_utc:
        return False
    if settings.poll_window_end_utc and now > settings.poll_window_end_utc:
        return False
    return True


# --- Providers ---------------------------------------------------------------

def _provider_fake(db: Session) -> tuple[int, str | None]:
    return 0, None


def _provider_churchill_downs(db: Session) -> tuple[int, str | None]:
    # TODO Day 1: verify URL, render, and parsing strategy.
    # If page is JS-rendered or behind Cloudflare, swap to TwinSpires or fall back to manual-only.
    return 0, "churchill_downs provider not yet implemented (open item Day 1)"


PROVIDERS: dict[str, Callable[[Session], tuple[int, str | None]]] = {
    "fake": _provider_fake,
    "churchill_downs": _provider_churchill_downs,
}


# --- Runner ------------------------------------------------------------------

def run_poll_once(db: Session, *, force: bool = False) -> dict:
    settings = get_settings()
    source = settings.poll_provider
    if not force and not in_window():
        run = PollRun(source=source, picks_updated=0, errors="outside_window")
        db.add(run)
        db.commit()
        return {"ran": False, "reason": "outside_window", "source": source}

    provider = PROVIDERS.get(source, _provider_fake)
    try:
        updated, err = provider(db)
    except Exception as e:  # pragma: no cover - guarded so the scheduler never crashes
        logger.exception("Poll run failed")
        run = PollRun(source=source, picks_updated=0, errors=str(e))
        db.add(run)
        db.commit()
        return {"ran": True, "source": source, "picks_updated": 0, "error": str(e)}

    run = PollRun(source=source, picks_updated=updated, errors=err)
    db.add(run)
    db.commit()
    return {"ran": True, "source": source, "picks_updated": updated, "error": err}


def _scheduled_tick() -> None:
    db = SessionLocal()
    try:
        run_poll_once(db)
    finally:
        db.close()


# --- Scheduler control -------------------------------------------------------

def start_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        return
    settings = get_settings()
    if not settings.poll_enabled:
        logger.info("Polling disabled by config")
        return

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _scheduled_tick,
        trigger=IntervalTrigger(seconds=settings.poll_interval_seconds),
        id="derby_poll",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("Poll scheduler started (interval=%ss)", settings.poll_interval_seconds)


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is None:
        return
    _scheduler.shutdown(wait=False)
    _scheduler = None


def get_next_run_at() -> datetime | None:
    if _scheduler is None:
        return None
    job = _scheduler.get_job("derby_poll")
    if not job or not job.next_run_time:
        return None
    return job.next_run_time

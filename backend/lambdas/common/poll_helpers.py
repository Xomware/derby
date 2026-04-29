"""Shared polling logic: provider stubs + window check + audit log."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Callable

from lambdas.common.constants import (
    POLL_ENABLED,
    POLL_PROVIDER,
    POLL_WINDOW_END_UTC,
    POLL_WINDOW_START_UTC,
)
from lambdas.common.dynamo_helpers import poll_runs_table
from lambdas.common.logger import get_logger
from lambdas.common.utility_helpers import iso_now, parse_iso, utcnow

log = get_logger(__file__)


def in_window(now: datetime | None = None) -> bool:
    if not POLL_ENABLED:
        return False
    now = now or utcnow()
    if POLL_WINDOW_START_UTC and now < parse_iso(POLL_WINDOW_START_UTC):
        return False
    if POLL_WINDOW_END_UTC and now > parse_iso(POLL_WINDOW_END_UTC):
        return False
    return True


def _provider_fake() -> tuple[int, str | None]:
    return 0, None


def _provider_churchill_downs() -> tuple[int, str | None]:
    # TODO Day 1: scrape churchilldowns.com results page.
    # If the page is JS-rendered or behind Cloudflare, fall back to TwinSpires
    # or accept manual-only updates.
    return 0, "churchill_downs provider not implemented"


_PROVIDERS: dict[str, Callable[[], tuple[int, str | None]]] = {
    "fake": _provider_fake,
    "churchill_downs": _provider_churchill_downs,
}


def _record(source: str, picks_updated: int, errors: str | None) -> dict:
    item = {
        "id": str(uuid.uuid4()),
        "type": "poll",
        "ran_at": iso_now(),
        "source": source,
        "picks_updated": picks_updated,
        "errors": errors,
    }
    poll_runs_table.put_item(Item=item)
    return item


def run_poll_once(*, force: bool = False) -> dict:
    source = POLL_PROVIDER
    if not force and not in_window():
        item = _record(source, 0, "outside_window")
        return {"ran": False, "reason": "outside_window", "source": source, "ran_at": item["ran_at"]}

    provider = _PROVIDERS.get(source, _provider_fake)
    try:
        picks_updated, err = provider()
    except Exception as e:  # noqa: BLE001
        log.exception("Poll run failed")
        item = _record(source, 0, f"unhandled: {e}")
        return {"ran": True, "source": source, "picks_updated": 0, "error": str(e), "ran_at": item["ran_at"]}

    item = _record(source, picks_updated, err)
    return {
        "ran": True,
        "source": source,
        "picks_updated": picks_updated,
        "error": err,
        "ran_at": item["ran_at"],
    }

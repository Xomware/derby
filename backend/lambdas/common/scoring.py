"""Scoring rules for prediction-vs-result leaderboards."""

from __future__ import annotations

from typing import Iterable

# Per-slot scoring. The same horse can score across multiple slots (e.g.,
# picked Win + Long shot, won the race) — but each slot is scored once.
SCORES: dict[str, dict[str, int]] = {
    # Exact slot hit, plus a 1-pt consolation for any other top-3 finish.
    "win": {"hit": 5, "board": 1},
    "place": {"hit": 3, "board": 1},
    "show": {"hit": 2, "board": 1},
    # Long shot: bigger reward for actually winning, smaller for top-3.
    "long_shot": {"win": 5, "board": 3},
}

SLOT_TARGET = {"win": 1, "place": 2, "show": 3}


def _normalize(name: str | None) -> str:
    if not name:
        return ""
    return name.strip().lower().replace("’", "'").replace("'", "'")


def _position_for(horse_name: str, finishers: Iterable[dict]) -> int | None:
    target = _normalize(horse_name)
    if not target:
        return None
    for f in finishers:
        if _normalize(f.get("horse_name")) == target:
            pos = f.get("position")
            try:
                return int(pos) if pos is not None else None
            except (TypeError, ValueError):
                return None
    return None


def score_slot(slot: str, horse_name: str | None, finishers: list[dict]) -> int:
    """Return the integer score for one (slot, horse) against finishers."""
    if not horse_name or not finishers:
        return 0
    pos = _position_for(horse_name, finishers)
    if pos is None:
        return 0

    on_board = pos <= 3

    if slot == "long_shot":
        if pos == 1:
            return SCORES["long_shot"]["win"]
        return SCORES["long_shot"]["board"] if on_board else 0

    rules = SCORES.get(slot)
    if not rules:
        return 0
    target = SLOT_TARGET.get(slot)
    if target and pos == target:
        return rules["hit"]
    return rules["board"] if on_board else 0


def score_prediction(prediction: dict, finishers: list[dict]) -> int:
    """Sum scores across all 4 slots of a prediction."""
    return sum(
        score_slot(slot, prediction.get(slot), finishers)
        for slot in ("win", "place", "show", "long_shot")
    )

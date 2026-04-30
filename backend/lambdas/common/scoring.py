"""Scoring rules for prediction-vs-result leaderboards.

Grant's formula (2026):
  Win:       finished 1st         → round(odds)
  Place:     finished 1st or 2nd  → round(odds / 2)
  Show:      finished 1st-3rd     → round(odds / 3)
  Long shot: finished 1st-4th     → 1

`odds` is the integer ratio from the morning-line / current odds at the time
the prediction was made (e.g. "5-1" → 5.0, "9/2" → 4.5). All payouts round to
the nearest integer (half rounds up via banker-of-1, math.floor + 0.5).
"""

from __future__ import annotations

from typing import Iterable

SLOT_TARGET_RANGE: dict[str, range] = {
    "win": range(1, 2),       # exact 1st
    "place": range(1, 3),     # 1st or 2nd
    "show": range(1, 4),      # 1st, 2nd, or 3rd
    "long_shot": range(1, 5), # top 4
}

LONG_SHOT_FLAT_POINTS = 1


def _normalize(name: str | None) -> str:
    if not name:
        return ""
    return name.strip().lower().replace("’", "'")


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


def odds_to_ratio(odds: str | None) -> float | None:
    """`'5-1'` → 5.0, `'9/2'` → 4.5, `'1/2'` → 0.5. Anything weird → None."""
    if not odds or not isinstance(odds, str):
        return None
    s = odds.strip().replace("/", "-")
    parts = s.split("-")
    if len(parts) != 2:
        return None
    try:
        n = float(parts[0])
        d = float(parts[1])
    except ValueError:
        return None
    if d <= 0:
        return None
    return n / d


def _round_int(x: float) -> int:
    # Half-up rounding so 2.5 → 3, 4.5 → 5 (matches typical sports scoring).
    return int(x + 0.5) if x >= 0 else -int(-x + 0.5)


def score_slot(
    slot: str,
    horse_name: str | None,
    finishers: list[dict],
    odds_by_horse: dict[str, str | None],
) -> int:
    if not horse_name or not finishers:
        return 0
    pos = _position_for(horse_name, finishers)
    if pos is None:
        return 0
    target = SLOT_TARGET_RANGE.get(slot)
    if not target or pos not in target:
        return 0

    if slot == "long_shot":
        return LONG_SHOT_FLAT_POINTS

    odds_str = odds_by_horse.get(_normalize(horse_name))
    ratio = odds_to_ratio(odds_str)
    if ratio is None:
        return 0

    if slot == "win":
        return max(_round_int(ratio), 0)
    if slot == "place":
        return max(_round_int(ratio / 2), 0)
    if slot == "show":
        return max(_round_int(ratio / 3), 0)
    return 0


def score_breakdown(
    prediction: dict,
    finishers: list[dict],
    odds_by_horse: dict[str, str | None],
) -> dict:
    """Compute per-slot scores plus the total for a single prediction."""
    out = {}
    total = 0
    for slot in ("win", "place", "show", "long_shot"):
        pts = score_slot(slot, prediction.get(slot), finishers, odds_by_horse)
        out[slot] = pts
        total += pts
    out["total"] = total
    return out


def score_prediction(
    prediction: dict,
    finishers: list[dict],
    odds_by_horse: dict[str, str | None],
) -> int:
    return score_breakdown(prediction, finishers, odds_by_horse)["total"]

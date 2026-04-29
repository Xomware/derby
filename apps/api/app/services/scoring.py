"""Leaderboard scoring rules. Single source of truth — easy to swap once Grant signs off."""

from __future__ import annotations

from app.models import RESULT_VALUES  # noqa: F401  (kept for future reference)

# A pick is "in the money" if it finished win/place/show.
IN_THE_MONEY = {"won", "placed", "showed"}
SCORED_RESULTS = {"won", "placed", "showed", "finished"}


def is_correct_tail(result: str) -> bool:
    """A tail vote scores when the picked horse won."""
    return result == "won"


def is_correct_fade(result: str) -> bool:
    """A fade scores when the picked horse did not finish in the money."""
    return result in SCORED_RESULTS and result not in IN_THE_MONEY


def vote_points(vote: str, result: str) -> int:
    if result not in SCORED_RESULTS:
        return 0
    if vote == "tail" and is_correct_tail(result):
        return 1
    if vote == "fade" and is_correct_fade(result):
        return 1
    return 0

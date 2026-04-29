"""Leaderboard scoring rules.

Single source of truth — easy to swap once Grant signs off on the rules.
"""

from lambdas.common.constants import SCORED_RESULTS

IN_THE_MONEY = {"won", "placed", "showed"}


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

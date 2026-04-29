from __future__ import annotations

from collections import defaultdict

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Pick, User, Vote
from app.schemas import LeaderboardOut, LeaderboardRow
from app.services.scoring import is_correct_fade, is_correct_tail, vote_points


def compute_leaderboard(db: Session) -> LeaderboardOut:
    rows_q = (
        select(Vote)
        .options(joinedload(Vote.user), joinedload(Vote.pick).load_only(Pick.id, Pick.result))
    )
    votes = db.scalars(rows_q).all()

    by_user: dict[str, dict] = defaultdict(lambda: {
        "username": "",
        "score": 0,
        "correct_tails": 0,
        "correct_fades": 0,
        "picks_voted": 0,
    })

    seen: set[tuple[str, str]] = set()  # (username, pick_id)

    for v in votes:
        user: User = v.user
        pick: Pick = v.pick
        rec = by_user[str(user.id)]
        rec["username"] = user.username
        key = (user.username, str(pick.id))
        if key not in seen:
            rec["picks_voted"] += 1
            seen.add(key)
        rec["score"] += vote_points(v.vote, pick.result)
        if v.vote == "tail" and is_correct_tail(pick.result):
            rec["correct_tails"] += 1
        elif v.vote == "fade" and is_correct_fade(pick.result):
            rec["correct_fades"] += 1

    sorted_rows = sorted(
        by_user.values(),
        key=lambda r: (-r["score"], -r["correct_tails"], -r["correct_fades"], r["username"].lower()),
    )

    return LeaderboardOut(
        rows=[
            LeaderboardRow(
                rank=i + 1,
                username=r["username"],
                score=r["score"],
                correct_tails=r["correct_tails"],
                correct_fades=r["correct_fades"],
                picks_voted=r["picks_voted"],
            )
            for i, r in enumerate(sorted_rows)
        ]
    )

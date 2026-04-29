"""GET /leaderboard — public leaderboard ranked by score then tiebreakers."""

from __future__ import annotations

from collections import defaultdict

from lambdas.common.dynamo_helpers import picks_table, scan_all, users_table, votes_table
from lambdas.common.errors import handle_errors
from lambdas.common.scoring import is_correct_fade, is_correct_tail, vote_points
from lambdas.common.utility_helpers import success_response

HANDLER = "leaderboard_get"


@handle_errors(HANDLER)
def handler(event, context):
    votes = scan_all(votes_table)
    if not votes:
        return success_response({"rows": []})

    pick_ids = {v["pick_id"] for v in votes}
    user_ids = {v["user_id"] for v in votes}

    pick_rows = scan_all(picks_table)
    pick_results = {p["id"]: p.get("result", "pending") for p in pick_rows if p["id"] in pick_ids}

    user_rows = scan_all(users_table)
    usernames = {u["id"]: u["username"] for u in user_rows if u["id"] in user_ids}

    by_user: dict[str, dict] = defaultdict(lambda: {
        "username": "",
        "score": 0,
        "correct_tails": 0,
        "correct_fades": 0,
        "picks_voted": 0,
    })
    seen: set[tuple[str, str]] = set()

    for v in votes:
        username = usernames.get(v["user_id"], "?")
        rec = by_user[v["user_id"]]
        rec["username"] = username
        key = (v["user_id"], v["pick_id"])
        if key not in seen:
            rec["picks_voted"] += 1
            seen.add(key)
        result = pick_results.get(v["pick_id"], "pending")
        rec["score"] += vote_points(v["vote"], result)
        if v["vote"] == "tail" and is_correct_tail(result):
            rec["correct_tails"] += 1
        elif v["vote"] == "fade" and is_correct_fade(result):
            rec["correct_fades"] += 1

    sorted_rows = sorted(
        by_user.values(),
        key=lambda r: (-r["score"], -r["correct_tails"], -r["correct_fades"], (r["username"] or "").lower()),
    )

    return success_response({
        "rows": [
            {"rank": i + 1, **{k: r[k] for k in ("username", "score", "correct_tails", "correct_fades", "picks_voted")}}
            for i, r in enumerate(sorted_rows)
        ]
    })

"""Static race schedule for Derby weekend 2026.

Approximate post times (Eastern Time) for Churchill Downs cards. Edit when
the actual program is published.
"""

from __future__ import annotations

# Each entry: (day, race_number, post_time_iso, name)
# day: "oaks" (Fri May 1, 2026) or "derby" (Sat May 2, 2026)
# Times are -04:00 (EDT). Adjust if the official program differs.

SCHEDULE: list[dict] = [
    # ---- Oaks Day ----  Friday, May 1, 2026
    {"day": "oaks", "race_number": 1, "post_time": "2026-05-01T10:30:00-04:00", "name": None},
    {"day": "oaks", "race_number": 2, "post_time": "2026-05-01T11:08:00-04:00", "name": None},
    {"day": "oaks", "race_number": 3, "post_time": "2026-05-01T11:42:00-04:00", "name": None},
    {"day": "oaks", "race_number": 4, "post_time": "2026-05-01T12:18:00-04:00", "name": None},
    {"day": "oaks", "race_number": 5, "post_time": "2026-05-01T12:53:00-04:00", "name": None},
    {"day": "oaks", "race_number": 6, "post_time": "2026-05-01T13:30:00-04:00", "name": None},
    {"day": "oaks", "race_number": 7, "post_time": "2026-05-01T14:07:00-04:00", "name": None},
    {"day": "oaks", "race_number": 8, "post_time": "2026-05-01T14:42:00-04:00", "name": None},
    {"day": "oaks", "race_number": 9, "post_time": "2026-05-01T15:25:00-04:00", "name": None},
    {"day": "oaks", "race_number": 10, "post_time": "2026-05-01T16:11:00-04:00", "name": None},
    {"day": "oaks", "race_number": 11, "post_time": "2026-05-01T20:40:00-04:00", "name": "Kentucky Oaks"},

    # ---- Derby Day ----  Saturday, May 2, 2026
    {"day": "derby", "race_number": 1, "post_time": "2026-05-02T10:30:00-04:00", "name": None},
    {"day": "derby", "race_number": 2, "post_time": "2026-05-02T11:00:00-04:00", "name": None},
    {"day": "derby", "race_number": 3, "post_time": "2026-05-02T11:36:00-04:00", "name": None},
    {"day": "derby", "race_number": 4, "post_time": "2026-05-02T12:11:00-04:00", "name": None},
    {"day": "derby", "race_number": 5, "post_time": "2026-05-02T12:46:00-04:00", "name": None},
    {"day": "derby", "race_number": 6, "post_time": "2026-05-02T13:25:00-04:00", "name": None},
    {"day": "derby", "race_number": 7, "post_time": "2026-05-02T14:01:00-04:00", "name": None},
    {"day": "derby", "race_number": 8, "post_time": "2026-05-02T14:43:00-04:00", "name": None},
    {"day": "derby", "race_number": 9, "post_time": "2026-05-02T15:21:00-04:00", "name": None},
    {"day": "derby", "race_number": 10, "post_time": "2026-05-02T16:01:00-04:00", "name": None},
    {"day": "derby", "race_number": 11, "post_time": "2026-05-02T16:39:00-04:00", "name": None},
    {"day": "derby", "race_number": 12, "post_time": "2026-05-02T18:57:00-04:00", "name": "Kentucky Derby"},
    {"day": "derby", "race_number": 13, "post_time": "2026-05-02T19:41:00-04:00", "name": None},
    {"day": "derby", "race_number": 14, "post_time": "2026-05-02T20:23:00-04:00", "name": None},
]

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

VoteValue = Literal["tail", "fade", "pass"]
ResultValue = Literal["pending", "won", "placed", "showed", "finished", "scratched"]


class ApiModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Auth ---

class RequestLinkIn(BaseModel):
    email: EmailStr


class CompleteSignupIn(BaseModel):
    username: str = Field(min_length=2, max_length=20, pattern=r"^[A-Za-z0-9_\-\.]+$")


class MeOut(ApiModel):
    id: uuid.UUID
    email: EmailStr
    username: str
    is_admin: bool


class VerifyOut(BaseModel):
    needs_username: bool
    user: MeOut | None = None


# --- Events ---

class EventOut(ApiModel):
    id: uuid.UUID
    name: str
    event_date: datetime
    is_active: bool


# --- Picks ---

class PickIn(BaseModel):
    race_number: int = Field(ge=1, le=20)
    race_post_time: datetime
    horse_name: str = Field(min_length=1, max_length=120)
    post_position: int | None = Field(default=None, ge=1, le=30)
    jockey: str | None = None
    trainer: str | None = None
    odds_at_pick: str | None = None
    confidence: int = Field(default=3, ge=1, le=5)
    writeup: str | None = None
    display_order: int = 0


class PickUpdate(BaseModel):
    race_number: int | None = None
    race_post_time: datetime | None = None
    horse_name: str | None = None
    post_position: int | None = None
    jockey: str | None = None
    trainer: str | None = None
    odds_at_pick: str | None = None
    confidence: int | None = None
    writeup: str | None = None
    display_order: int | None = None


class PickResultUpdate(BaseModel):
    result: ResultValue


class VoterOut(BaseModel):
    username: str


class VoteCounts(BaseModel):
    tail: int = 0
    fade: int = 0
    pass_: int = Field(default=0, alias="pass")
    model_config = ConfigDict(populate_by_name=True)


class PickOut(ApiModel):
    id: uuid.UUID
    event_id: uuid.UUID
    race_number: int
    race_post_time: datetime
    horse_name: str
    post_position: int | None
    jockey: str | None
    trainer: str | None
    odds_at_pick: str | None
    confidence: int
    writeup: str | None
    result: ResultValue
    display_order: int
    locked: bool
    counts: VoteCounts
    voters: dict[str, list[VoterOut]]  # {"tail": [...], "fade": [...], "pass": [...]}
    my_vote: VoteValue | None = None


class PicksGroupedOut(BaseModel):
    event: EventOut
    races: list[RaceGroup]


class RaceGroup(BaseModel):
    race_number: int
    race_post_time: datetime
    locked: bool
    picks: list[PickOut]


PicksGroupedOut.model_rebuild()


# --- Votes ---

class VoteIn(BaseModel):
    pick_id: uuid.UUID
    vote: VoteValue


class VoteOut(ApiModel):
    id: uuid.UUID
    pick_id: uuid.UUID
    vote: VoteValue
    updated_at: datetime


# --- Leaderboard ---

class LeaderboardRow(BaseModel):
    rank: int
    username: str
    score: int
    correct_tails: int
    correct_fades: int
    picks_voted: int


class LeaderboardOut(BaseModel):
    rows: list[LeaderboardRow]


# --- Admin ---

class AdminUserOut(ApiModel):
    id: uuid.UUID
    email: EmailStr
    username: str
    is_admin: bool
    created_at: datetime
    last_login_at: datetime | None
    vote_count: int


class PollStatusOut(BaseModel):
    last_ran_at: datetime | None
    last_source: str | None
    last_picks_updated: int | None
    last_errors: str | None
    poll_enabled: bool
    next_run_at: datetime | None

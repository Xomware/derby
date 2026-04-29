"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-04-29

"""
from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("username", sa.String(20), nullable=False, unique=True),
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_users_email", "users", ["email"])
    op.create_index("ix_users_username", "users", ["username"])

    op.create_table(
        "magic_link_tokens",
        sa.Column("token", sa.String(64), primary_key=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_magic_link_tokens_email", "magic_link_tokens", ["email"])

    op.create_table(
        "events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("event_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "picks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("event_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False),
        sa.Column("race_number", sa.Integer(), nullable=False),
        sa.Column("race_post_time", sa.DateTime(timezone=True), nullable=False),
        sa.Column("horse_name", sa.String(120), nullable=False),
        sa.Column("post_position", sa.Integer(), nullable=True),
        sa.Column("jockey", sa.String(120), nullable=True),
        sa.Column("trainer", sa.String(120), nullable=True),
        sa.Column("odds_at_pick", sa.String(20), nullable=True),
        sa.Column("confidence", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("writeup", sa.Text(), nullable=True),
        sa.Column("result", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("display_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint(
            "result IN ('pending','won','placed','showed','finished','scratched')",
            name="picks_result_check",
        ),
        sa.CheckConstraint("confidence BETWEEN 1 AND 5", name="picks_confidence_check"),
    )
    op.create_index("ix_picks_event_id", "picks", ["event_id"])

    op.create_table(
        "votes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pick_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("picks.id", ondelete="CASCADE"), nullable=False),
        sa.Column("vote", sa.String(10), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("user_id", "pick_id", name="votes_user_pick_uq"),
        sa.CheckConstraint("vote IN ('tail','fade','pass')", name="votes_vote_check"),
    )
    op.create_index("ix_votes_user_id", "votes", ["user_id"])
    op.create_index("ix_votes_pick_id", "votes", ["pick_id"])

    op.create_table(
        "poll_runs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ran_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("source", sa.String(40), nullable=False),
        sa.Column("picks_updated", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("errors", sa.Text(), nullable=True),
    )
    op.create_index("ix_poll_runs_ran_at", "poll_runs", ["ran_at"])


def downgrade() -> None:
    op.drop_index("ix_poll_runs_ran_at", table_name="poll_runs")
    op.drop_table("poll_runs")
    op.drop_index("ix_votes_pick_id", table_name="votes")
    op.drop_index("ix_votes_user_id", table_name="votes")
    op.drop_table("votes")
    op.drop_index("ix_picks_event_id", table_name="picks")
    op.drop_table("picks")
    op.drop_table("events")
    op.drop_index("ix_magic_link_tokens_email", table_name="magic_link_tokens")
    op.drop_table("magic_link_tokens")
    op.drop_index("ix_users_username", table_name="users")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

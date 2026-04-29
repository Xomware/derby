"""Constants for derby Lambda handlers."""

import os

PRODUCT = "derby"
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")
AWS_DEFAULT_REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-1")
APP_NAME = os.environ.get("APP_NAME", "derby")

# Single-event v1 — hardcode the event id; switch to events table in v2.
EVENT_ID = os.environ.get("EVENT_ID", "2026-kentucky-derby")
EVENT_NAME = os.environ.get("EVENT_NAME", "2026 Kentucky Derby")

APP_BASE_URL = os.environ.get("APP_BASE_URL", "https://derby.xomware.com")
COOKIE_DOMAIN = os.environ.get("COOKIE_DOMAIN", ".xomware.com")
SESSION_COOKIE = "derby_session"
SESSION_DAYS = int(os.environ.get("SESSION_DAYS", "30"))

# Voting closes this many seconds before each race's post time.
LOCK_BUFFER_SECONDS = int(os.environ.get("LOCK_BUFFER_SECONDS", "300"))

# DynamoDB tables (set per-app via Terraform-injected env vars)
USERS_TABLE = os.environ.get("USERS_TABLE", f"{APP_NAME}-users")
PICKS_TABLE = os.environ.get("PICKS_TABLE", f"{APP_NAME}-picks")
VOTES_TABLE = os.environ.get("VOTES_TABLE", f"{APP_NAME}-votes")
POLL_RUNS_TABLE = os.environ.get("POLL_RUNS_TABLE", f"{APP_NAME}-poll-runs")
RACE_RESULTS_TABLE = os.environ.get("RACE_RESULTS_TABLE", f"{APP_NAME}-race-results")
VISITS_TABLE = os.environ.get("VISITS_TABLE", f"{APP_NAME}-visits")

# GSI names
USERS_USERNAME_INDEX = "username-index"
USERS_ID_INDEX = "id-index"
PICKS_EVENT_INDEX = "event-index"
VOTES_USER_INDEX = "user-index"
POLL_RUNS_TYPE_INDEX = "type-index"
VISITS_USER_INDEX = "user-index"
VISITS_DAY_INDEX = "day-index"

# Result + vote enums
RESULT_VALUES = ("pending", "won", "placed", "showed", "finished", "scratched")
VOTE_VALUES = ("tail", "fade", "pass")
SCORED_RESULTS = {"won", "placed", "showed", "finished"}

# SES sender + admin bootstrap
FROM_EMAIL = os.environ.get("FROM_EMAIL", "noreply@derby.xomware.com")
ADMIN_EMAILS = [e.strip().lower() for e in os.environ.get("ADMIN_EMAILS", "").split(",") if e.strip()]

# Polling window (UTC)
POLL_ENABLED = os.environ.get("POLL_ENABLED", "false").lower() == "true"
POLL_WINDOW_START_UTC = os.environ.get("POLL_WINDOW_START_UTC", "")
POLL_WINDOW_END_UTC = os.environ.get("POLL_WINDOW_END_UTC", "")
POLL_PROVIDER = os.environ.get("POLL_PROVIDER", "fake")

RESERVED_USERNAMES = {
    "admin", "administrator", "root", "system", "moderator",
    "grant", "sungod", "sun-god", "sun_god", "oracle", "derby",
}

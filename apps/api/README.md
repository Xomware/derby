# Derby API

FastAPI service for derby.xoware.com — auth, picks, votes, leaderboard, polling.

## Local setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Either:
#   docker compose up -d   (from repo root, local Postgres)
# or set DATABASE_URL to your Neon URL.
alembic upgrade head
python -m app.scripts.seed
uvicorn app.main:app --reload --port 8000
```

Health check: `GET /healthz` → `{"ok": true}`
OpenAPI: `http://localhost:8000/docs`

## Auth flow (curl)

```bash
# 1. Request magic link (in dev with no Resend key, link is logged to stderr)
curl -sX POST localhost:8000/auth/request-link -H 'content-type: application/json' \
  -d '{"email":"you@example.com"}'

# 2. Open the verify URL from the log. First time → response prompts for username.
# 3. Complete signup
curl -sX POST localhost:8000/auth/complete-signup -H 'content-type: application/json' \
  --cookie "derby_signup=<value-from-verify-response-cookie>" \
  -d '{"username":"yourname"}'

# 4. Subsequent /auth/me with the derby_session cookie
```

## Layout

```
app/
├── main.py            FastAPI factory + lifespan
├── config.py          Pydantic settings
├── db.py              Engine / session
├── models.py          SQLAlchemy ORM
├── schemas.py         Pydantic I/O
├── auth.py            JWT + magic token helpers
├── deps.py            Auth dependencies
├── email.py           Resend client
├── routers/           auth, picks, votes, leaderboard, admin
├── services/          scoring, polling, picks_service, leaderboard_service
└── scripts/seed.py    Temp 2026 Derby seed
alembic/               Migrations
```

## Deployment notes

- Single-instance deploy (Railway or Fly). APScheduler runs in-process — running
  multiple replicas will produce duplicate poll runs. Pin to one instance until
  a leader-lock pattern is added.
- Set `COOKIE_SECURE=true` and `COOKIE_DOMAIN=.xoware.com` in prod.
- Keep `POLL_ENABLED=false` until the scrape source is verified.

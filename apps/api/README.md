# Derby API

FastAPI service for `api.derby.xoware.com` — auth, picks, votes, leaderboard, results polling.

Deploys to **Vercel Python serverless** (free Hobby tier). Cron polling runs from a GitHub Actions workflow that hits `/internal/poll` on a schedule.

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
# 3. Complete signup (cookie was set on /verify response)
curl -sX POST localhost:8000/auth/complete-signup -H 'content-type: application/json' \
  --cookie "derby_signup=<value>" \
  -d '{"username":"yourname"}'

# 4. /auth/me reads derby_session cookie set on /verify (returning user) or /complete-signup (new user)
```

## Layout

```
api/index.py           Vercel entry — re-exports the FastAPI ASGI app
vercel.json            Rewrites all paths to api/index.py
app/
├── main.py            FastAPI factory + lifespan
├── config.py          Pydantic settings
├── db.py              Engine / session
├── models.py          SQLAlchemy ORM
├── schemas.py         Pydantic I/O
├── auth.py            JWT + magic-token helpers
├── deps.py            Auth dependencies
├── email.py           Resend client
├── routers/           auth, picks, votes, leaderboard, admin, internal
├── services/          scoring, polling, picks_service, leaderboard_service
└── scripts/seed.py    Temp 2026 Derby seed
alembic/               Migrations (run locally against Neon URL)
```

## Polling architecture

Vercel Hobby tier doesn't allow sub-daily Cron Jobs, so polling fires from
`.github/workflows/poll.yml` every 5 minutes during the May 2 race window.
The workflow `POST`s to `/internal/poll` with a shared `X-Internal-Secret`
header. The endpoint short-circuits if `POLL_ENABLED=false` or we're outside
the configured window. Manual `/admin/poll-now` still works for spot checks.

## Deployment notes

- Migrations: `alembic upgrade head` runs locally pointed at the Neon
  `DATABASE_URL`, not at deploy time. Re-run on schema changes.
- Cookies in prod: `COOKIE_SECURE=true`, `COOKIE_DOMAIN=.xoware.com`.
- Keep `POLL_ENABLED=false` until the Churchill Downs scrape source is verified.
- `INTERNAL_SECRET` must match the value in the GitHub Actions repo secret.

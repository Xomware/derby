# Xoware Derby

Grant's annual Kentucky Derby picks site with tail/fade voting, leaderboard, and live results.

**Live**: derby.xoware.com (target deploy: May 2, 2026)
**Persona**: Sun Oracle — "G Titty the Sun Oracle"

## Layout

```
derby/
├── apps/
│   ├── web/          Next.js 15 + Tailwind v4 (deploys to Vercel)
│   └── api/          FastAPI + SQLAlchemy + Alembic (deploys to Railway/Fly)
├── infrastructure/
│   └── terraform/    Route53 DNS for derby.xoware.com + Resend records
└── docs/
    └── PLAN.md       Locked v2 project plan
```

## Stack

| Layer    | Choice                     |
| -------- | -------------------------- |
| Frontend | Next.js 15 on Vercel       |
| Backend  | FastAPI on Railway/Fly     |
| DB       | Neon Postgres              |
| Email    | Resend (magic-link auth)   |
| Polling  | APScheduler (in-process)   |
| DNS      | Route53 (xoware.com zone)  |

## Quickstart

### Backend

```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # fill in DATABASE_URL, RESEND_API_KEY, etc.
alembic upgrade head
python -m app.scripts.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd apps/web
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### Local DB (optional)

```bash
docker compose up -d       # local postgres on :5432
```

## Workflow

See [docs/PLAN.md](docs/PLAN.md) for the locked feature plan and build schedule.

# Xoware Derby

Grant's annual Kentucky Derby picks site with tail/fade voting, leaderboard, and live results.

**Live**: derby.xoware.com (target deploy: May 2, 2026)
**Persona**: Sun Oracle — "G Titty the Sun Oracle"

## Stack — all free, no credit card required

| Layer    | Choice                                            |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 15 on Vercel (Hobby)                      |
| Backend  | FastAPI on Vercel Python serverless (Hobby)       |
| DB       | Neon Postgres (Free)                              |
| Email    | Resend (Free, 3000 emails/mo)                     |
| Polling  | GitHub Actions cron → `/internal/poll`            |
| DNS      | Route53 (existing `xoware.com` zone)              |

## Layout

```
derby/
├── apps/
│   ├── web/                    Next.js 15 + Tailwind v4
│   └── api/                    FastAPI on Vercel Python runtime
│       ├── api/index.py        Vercel entry (re-exports ASGI app)
│       ├── vercel.json
│       ├── app/                application code
│       └── alembic/            schema migrations
├── infrastructure/
│   └── terraform/              Route53 + Resend DNS records
├── .github/workflows/poll.yml  Race-day cron poller
├── docker-compose.yml          Local Postgres for offline dev
└── docs/PLAN.md                Locked v2 project plan
```

## Local development

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
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### Local DB (optional)

```bash
docker compose up -d       # postgres on :5432
```

## Deployment

Driven by Vercel CLI + Terraform. See:

- [`apps/api/README.md`](apps/api/README.md) — API deploy notes
- [`apps/web/README.md`](apps/web/README.md) — Web deploy notes
- [`infrastructure/terraform/README.md`](infrastructure/terraform/README.md) — DNS apply order

High-level flow:

1. `neonctl projects create` → grab `DATABASE_URL`
2. `vercel link` + `vercel deploy --prod` for both `apps/api` and `apps/web`
3. Add custom domains in Vercel: `derby.xoware.com`, `api.derby.xoware.com`
4. Resend signup → verify domain → grab DKIM record
5. Fill `infrastructure/terraform/terraform.tfvars`, `terraform apply` — Route53 + Resend DNS
6. Add GitHub repo secrets: `API_URL`, `INTERNAL_SECRET`

## Workflow

See [docs/PLAN.md](docs/PLAN.md) for the locked feature plan, scoring rules, and build schedule.

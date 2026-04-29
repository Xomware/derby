# Sun God Derby

Grant's annual Kentucky Derby picks site with tail/fade voting, leaderboard, and live results.

**Live**: `derby.xomware.com` (target deploy: May 2, 2026)
**Brand**: Sun God Derby — handwritten green "Sun God" + serif "Derby"
**Admins**: dominickj.giordano@gmail.com, gtatich@gmail.com

## Stack

Mirrors the AWS pattern used across `xomify`, `xomper`, `meals`, etc.

| Layer    | Choice                                                       |
| -------- | ------------------------------------------------------------ |
| Frontend | Next.js 15 (static export) → S3 + CloudFront                 |
| Backend  | Python 3.11 Lambdas behind API Gateway (`api.derby.xomware.com`) |
| Storage  | DynamoDB (5 tables, PAY_PER_REQUEST)                         |
| Auth     | Magic-link via SES → JWT in `derby_session` cookie           |
| Polling  | EventBridge cron → `cron_poll_results` Lambda                |
| DNS      | Route53 (existing `xomware.com` zone)                        |
| State    | `s3://xomware-terraform-state/derby/terraform.tfstate`       |

Cost: $0/month (everything fits in AWS Free Tier).

## Layout

```
derby/
├── frontend/                       Next.js 15 + Tailwind v4 (static export)
├── backend/
│   ├── lambdas/
│   │   ├── common/                 Shared layer (logger, errors, dynamo, ses, jwt, scoring)
│   │   ├── authorizer/             JWT authorizer
│   │   ├── auth_*                  Auth endpoints
│   │   ├── picks_*                 Picks endpoints
│   │   ├── votes_*                 Votes endpoints
│   │   ├── leaderboard_get/        Public leaderboard
│   │   ├── admin_*                 Admin CRUD + result override + signups + poll
│   │   └── cron_poll_results/      EventBridge-triggered race-day poller
│   ├── requirements.txt            Layer deps
│   ├── scripts/seed.py             Seed temp picks into DynamoDB
│   └── templates/lambda_stub.zip   Used by Terraform on first apply
├── infrastructure/terraform/       Full Terraform stack
└── .github/workflows/
    ├── terraform.yml               Plan on PR, apply on push to main / dispatch
    ├── deploy-frontend.yml         Build + S3 sync + CloudFront invalidate
    ├── deploy-backend.yml          Per-Lambda zip + update-function-code
    └── add-to-board.yml            XomBoard auto-add on new issue
```

## Required GitHub repo secrets

| Secret                         | Used by                  | Notes                                               |
| ------------------------------ | ------------------------ | --------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`            | all workflows            | The `xom-claude-cicd` IAM user (already exists)     |
| `AWS_SECRET_ACCESS_KEY`        | all workflows            |                                                     |
| `CLOUDFRONT_DISTRIBUTION_ID`   | deploy-frontend.yml      | Read from `terraform output cloudfront_distribution_id` after first apply |
| `BOARD_TOKEN`                  | add-to-board.yml         | Optional — only needed if you want issue → board    |

## Order of operations

1. **Push code.** Commits to `main` trigger `terraform.yml` on infrastructure changes.
2. **First Terraform apply** (manual via GitHub Actions → "Terraform" → Run workflow). Creates everything as stubs.
3. SES domain identity will be in `Pending` until DNS propagates (~1–10 min). Then it auto-verifies and `aws_ses_domain_identity_verification` succeeds.
4. **Push backend changes** → `deploy-backend.yml` ships real Lambda code on top of the stubs.
5. **Push frontend changes** → `deploy-frontend.yml` builds Next.js and syncs to S3.
6. Add `CLOUDFRONT_DISTRIBUTION_ID` to repo secrets (one-time, after first Terraform apply).
7. **Seed picks**: `python backend/scripts/seed.py` from your laptop (uses local AWS creds), or wait for Grant to add via `/admin/`.
8. **Day-of**: flip `poll_enabled = true` in `terraform.tfvars`, push → EventBridge starts the cron.

## Local development

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=https://api.derby.xomware.com
npm run dev
```

### Backend

Lambdas read DynamoDB directly. Easiest local test:

```bash
cd backend
pip install -r requirements.txt
python scripts/seed.py   # one-shot seed using your AWS creds
```

To exercise a single handler:

```bash
cd backend
python -c "from lambdas.picks_list.handler import handler; print(handler({}, None))"
```

## SES production access

SES starts in **sandbox** by default (only verified recipient emails work). Before May 2, request production access in the SES console — otherwise the magic-link emails to Grant's friends will silently fail.

## See also

- [`docs/PLAN.md`](docs/PLAN.md) — locked feature plan and scoring rules
- [`backend/README.md`](backend/README.md)
- [`frontend/README.md`](frontend/README.md)
- [`infrastructure/terraform/README.md`](infrastructure/terraform/README.md)

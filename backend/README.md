# Derby Backend

Discrete Python Lambda handlers behind API Gateway at `api.derby.xomware.com`.
Mirrors the `xomify-backend` / `xomper-back-end` pattern.

## Layout

```
backend/
├── lambdas/
│   ├── common/                  Shared layer code (logger, errors, dynamo, ses, jwt, scoring)
│   ├── authorizer/              JWT authorizer (cookie or Bearer)
│   ├── auth_request_link/       POST /auth/request-link
│   ├── auth_verify/             GET  /auth/verify
│   ├── auth_complete_signup/    POST /auth/complete-signup
│   ├── auth_logout/             POST /auth/logout
│   ├── auth_me/                 GET  /auth/me
│   ├── picks_list/              GET  /picks
│   ├── picks_get/               GET  /picks/{id}
│   ├── votes_upsert/            POST /votes
│   ├── votes_me/                GET  /votes/me
│   ├── leaderboard_get/         GET  /leaderboard
│   ├── admin_picks_create/      POST   /admin/picks
│   ├── admin_picks_update/      PATCH  /admin/picks/{id}
│   ├── admin_picks_delete/      DELETE /admin/picks/{id}
│   ├── admin_picks_set_result/  PATCH  /admin/picks/{id}/result
│   ├── admin_users_list/        GET    /admin/users
│   ├── admin_poll_status/       GET    /admin/poll-status
│   ├── admin_poll_now/          POST   /admin/poll-now
│   └── cron_poll_results/       EventBridge scheduled (no API Gateway)
├── requirements.txt             Layer deps (PyJWT, requests, beautifulsoup4)
├── scripts/seed.py              One-shot to seed temp picks into DynamoDB
└── templates/lambda_stub.zip    Used by Terraform during initial create
```

## DynamoDB tables (Terraform-managed)

- `derby-users` PK `email`, GSI `username-index`, GSI `id-index`
- `derby-magic-link-tokens` PK `token`, GSI `email-index`, TTL on `expires_at`
- `derby-picks` PK `id`, GSI `event-index` PK `event_id`
- `derby-votes` PK `pick_id` SK `user_id`, GSI `user-index` PK `user_id`
- `derby-poll-runs` PK `id`, GSI `type-index` PK `type` SK `ran_at`

## Auth

Magic-link via SES → JWT in `derby_session` cookie (Domain=`.xomware.com`,
HttpOnly, Secure, SameSite=Lax, 30-day max-age). Authorizer Lambda accepts the
cookie or `Authorization: Bearer <jwt>` so future mobile clients are covered.

## Local dev

Lambdas read DynamoDB and SSM directly — easiest path is to point your AWS
profile at the dev account and run handlers via a local test:

```python
from lambdas.picks_list.handler import handler
print(handler({}, None))
```

To seed temp picks:

```bash
cd backend
python scripts/seed.py
```

## Deployment

GitHub Actions `deploy-backend.yml` packages each changed Lambda + the shared
layer and runs `aws lambda update-function-code`. See workflow for details.

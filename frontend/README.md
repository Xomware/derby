# Derby Web

Next.js 15 + Tailwind v4 frontend for `derby.xomware.com`. Builds as a fully
static site (`output: 'export'`) and deploys to S3 + CloudFront via GitHub
Actions, matching the `meals-frontend` / `xomify-frontend` pattern.

## Local

```bash
npm install
cp .env.local.example .env.local       # NEXT_PUBLIC_API_URL=...
npm run dev
```

For local dev against a local API, set `NEXT_PUBLIC_API_URL=http://localhost:3001`
(or whatever port a local API stub runs on). Otherwise point at the deployed
API.

## Pages

- `/` — countdown, race-grouped picks, live tail/fade buttons, leaderboard preview
- `/leaderboard/` — full leaderboard
- `/login/` — magic-link request
- `/auth/verify/` — token verification + first-time username prompt
- `/admin/` — pick CRUD, manual result override, signups view, polling status

`trailingSlash: true` is set so static export emits one folder per route — easier
to host on S3 with CloudFront default-root rewrites.

## Build

```bash
npm run build       # writes static site to ./out/
```

## Deploy

CI/CD: `.github/workflows/deploy-frontend.yml` (in repo root) runs on push to
main and:

1. `npm ci && npm run build`
2. `aws s3 sync ./out s3://derby.xomware.com/ --delete`
3. `aws cloudfront create-invalidation --paths "/*"`

S3 bucket + CloudFront distribution are created by Terraform via the shared
`web-hosting` module.

## Theme

Tailwind v4 `@theme` block in `src/app/globals.css` defines the brand tokens:
`rose-red`, `rose-dark`, `bourbon`, `mint-julep`, `cream`, `ink`. Display font
is serif (Georgia fallback) until Grant ships the brand kit. Logo is a
placeholder "S" disc — swap when the real mark lands.

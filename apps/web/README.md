# Derby Web

Next.js 15 + Tailwind v4 frontend for derby.xoware.com.

## Local

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:3000`.

## Pages

- `/` — countdown, race-grouped picks, live tail/fade buttons, leaderboard preview
- `/leaderboard` — full leaderboard
- `/login` — magic-link request
- `/auth/verify` — token verification + first-time username prompt
- `/admin` — pick CRUD, manual result override, signups view, polling status

## Deploy (Vercel)

- Project root: `apps/web`
- Env vars: `NEXT_PUBLIC_API_URL=https://api.derby.xoware.com`
- Add `derby.xoware.com` as custom domain (CNAME via Terraform)

## Theme

Tailwind v4 `@theme` block in `src/app/globals.css` defines the brand tokens:

- `rose-red`, `rose-dark`, `bourbon`, `mint-julep`, `cream`, `ink`
- Display font: serif (Georgia fallback)

Logos are placeholder discs with "S" — swap for Grant's mark when picked.

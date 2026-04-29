# Xoware Derby — Project Plan (v2)

Personal project. Grant's annual Kentucky Derby picks site with tail/fade voting, leaderboard, and live results.

- **Deadline**: May 2, 2026 (Derby Day) — 3 days
- **URL**: derby.xoware.com
- **Audience**: Public site, organic distribution to Grant's friend group via shared link

## Stack (locked in)

| Layer            | Choice                                       |
| ---------------- | -------------------------------------------- |
| Frontend         | Next.js on Vercel (Hobby)                    |
| Backend          | FastAPI on Vercel Python serverless (Hobby)  |
| Database         | Neon (Free)                                  |
| Auth             | Magic link, custom, JWT-based                |
| Email            | Resend (Free)                                |
| Polling worker   | GitHub Actions cron → `/internal/poll`       |
| Domain           | derby.xoware.com (subdomain)                 |

Cost: $0/month (no credit card needed at any vendor).
Decision history: originally planned for Fly.io. Switched to Vercel-only
because Fly requires a credit card on file even for the free tier, and the
serverless model removes the multi-instance APScheduler risk we flagged in
brainstorming.

## Branding (locked in)

**Name**: TBD — leaning toward Sun Oracle with G Titty the Sun Oracle as the persona/byline.

**Color palette**:
- Rose Red `#C8102E` — primary
- Bourbon Brown `#5D4037` — secondary
- Mint Julep Green `#7BA77B` — accent
- Cream `#FAF6E8` — background (suggested)
- Dark Rose `#8B0A1F` — primary depth/shadow tone (suggested)

**Logo**: roses required. Four concept directions; awaiting Grant's pick.
1. Sunburst Rose — sun rays radiating from a central rose
2. Horseshoe Crest — bourbon horseshoe framing sun + rose
3. Rose Garland — half-wreath like the Derby winner's garland
4. Monogram (SO) — bold "SO" with rose dotting the O

**Typography**: serif for headings, sans for body.

## Features

### v1 — Ship by May 2

- **Public landing**: hero with branding, countdown to post time, race-grouped picks, sign-in CTA.
- **Pick cards**: horse, post position, jockey, trainer, odds-at-pick, confidence (1–5), Grant's writeup, result badge, tail/fade/pass buttons + live counts + voter usernames.
- **Auth**: magic link via Resend, JWT cookie session (30 days), required username on first signup.
- **Tail / Fade voting**: per pick, locks at race post time (server-enforced), changeable until lock.
- **Leaderboard (live)**: +1 correct tail, +1 correct fade.
- **Race-day results**: APScheduler polls primary scrape source every 2 min during race window; manual admin override always available.
- **Admin** (`/admin`): pick CRUD, manual result override, signups view, polling status.
- **Analytics**: Plausible or Vercel Analytics, no cookie banner.

### v2 — Future

- Past years archive (carry over write-ups, no voting)
- Google sign-in
- Email blast tool for next year's launch
- Triple Crown / Breeders' Cup support (multi-event)
- Native mobile share cards (OG tags)

## Data Model

```
users
  id, email (unique), username (unique), is_admin, created_at, last_login_at

magic_link_tokens
  token (PK), email, expires_at, used_at

events
  id, name, event_date, is_active

picks
  id, event_id, race_number, race_post_time, horse_name, post_position,
  jockey, trainer, odds_at_pick, confidence (1-5), writeup, result, display_order

votes
  id, user_id, pick_id, vote (tail|fade|pass), created_at, updated_at
  UNIQUE(user_id, pick_id)

poll_runs
  id, ran_at, source, picks_updated, errors
```

## API Routes

**Auth**
- `POST /auth/request-link` — `{email}` → email sent
- `GET  /auth/verify?token=...` — first-time? prompt username; else cookie + redirect
- `POST /auth/complete-signup` — `{username}` (only if first time)
- `POST /auth/logout`
- `GET  /auth/me`

**Picks (public)**
- `GET /picks` — picks for active event, grouped by race, with vote counts + voter usernames
- `GET /picks/{id}`

**Votes (authed)**
- `POST /votes` — `{pick_id, vote}` upsert; checks lock
- `GET  /votes/me`

**Leaderboard (public)**
- `GET /leaderboard`

**Admin (admin only)**
- `POST/PATCH/DELETE /admin/picks` and `/admin/picks/{id}`
- `PATCH /admin/picks/{id}/result`
- `GET /admin/users`
- `GET /admin/poll-status`
- `POST /admin/poll-now`

## Pages (Next.js)

- `/` — landing, picks list, vote UI, leaderboard preview
- `/leaderboard` — full leaderboard
- `/login` — magic link request
- `/auth/verify` — token validation, username prompt if new
- `/admin` — pick management, results override, signups, polling status
- `/results` — post-Derby summary

## Polling Strategy

Goal: auto-update pick results within ~5 min of race finishing.

- **Primary source**: scrape Churchill Downs results page (verify URL + parseability Day 1).
- **Backup source**: TwinSpires.
- **Trigger**: GitHub Actions workflow `.github/workflows/poll.yml` runs `*/5` between 16:00–24:00 UTC on May 2, 2026 (≈ 12pm–8pm ET). Workflow `POST`s to `/internal/poll` with `X-Internal-Secret` header.
- **Schedule guard**: server-side, gated by `POLL_ENABLED` and `POLL_WINDOW_*_UTC`. Outside window, the endpoint returns `outside_window` without scraping.
- **Failure mode**: page change → silent fail → manual admin override. Every poll logged to `poll_runs`. Errors surfaced in admin dashboard.

## Build Plan (3 days)

**Day 1 (Wed Apr 29)**
- Repo init, Vercel + Railway projects, Neon DB
- Resend account + DNS records on xoware.com
- FastAPI scaffold: auth endpoints
- DB migrations (Alembic)
- Test magic-link flow end-to-end via curl

**Day 2 (Thu Apr 30)**
- Picks API (public read, admin write)
- Votes API with lock enforcement
- Leaderboard API
- Next.js scaffold + auth UI (login, verify, username prompt)
- Pick cards UI (read-only first)

**Day 3 (Fri May 1)**
- Vote buttons + live counts
- Leaderboard page
- Admin page (picks, results override, signups)
- Polling worker scaffolded (manual trigger working)
- Deploy to prod, DNS wired, SSL working
- Grant adds his picks via admin page

**Day 4 (Sat May 2 — Derby Day)**
- Smoke test, share link
- Polling enabled at noon ET
- Spot-check results, manual override as needed
- Lock voting post-Derby, freeze leaderboard, screenshot final standings

## Open Items

- Grant's final logo direction + brand name confirmation
- Grant's email for admin access
- Resend DNS records won't conflict with anything else on xoware.com
- Decide: Railway vs Fly.io (start with Railway — simpler dashboards)
- Verify Churchill Downs scrape Day 1 (fallback: TwinSpires; final fallback: manual-only)

## Risks

| Risk                        | Mitigation                                          |
| --------------------------- | --------------------------------------------------- |
| Scraping breaks day-of      | Manual override always available                    |
| Email deliverability fails  | Resend domain verified Day 1, test on personal email|
| Magic link spam             | Rate limit: 3 requests / 15 min per email           |
| Username squatting          | Reserved list ("admin", "grant"), cap length 20     |
| Race timing data wrong      | Grant supplies race_post_time; show local-TZ preview|
| Vote lock bypass            | Server-side check on every POST /votes              |
| Spec creep                  | v2 list captured, no exceptions until May 2 ships   |

## Scoring rules (TBD — confirm with Grant)

Default proposal until Grant confirms:
- **Correct tail**: pick won (`won`).
- **Correct fade**: pick did not finish in the money (anything other than `won`/`placed`/`showed`).
- **Scratched picks**: pass-only (no scoring). Tail/fade votes refunded if pick scratches.

This is encoded as a single function in `app/services/scoring.py` so it's easy to update after Grant signs off.

# 09: The preview check

Status: paused 2026-11-27 (was ready-for-agent): the owner chose GitHub Actions → Cloudflare (`../spec.md`)
Type: task
Who: Opus, then the owner looks at the screens
Blocked by: 06, 07, 08, 12

## What to do

Against a PR preview, `https://staging.para-commute.org` and (once `main` has deployed on Vercel) the production `*.vercel.app` alias. Write each result under Comments.

- **Pages:** `/`, `/studio/`, `/contribute/`, `/app/`, `/coming-soon/` load with no console error. The map draws its basemap from `tiles.para-commute.org` (12 allowed the origin): no blank map, no CORS error in the console.
- **Routing:** 02's checks. **Headers:** 03's checks, side by side with `www` today. **Coming soon:** 04's checks. **Report:** 05's preview check.
- **Offline:** install the map from staging on a phone (Android Chrome), go offline, reopen: it opens; a publish after that shows the update notice.
- **The contributor page:** record a short walk on staging (not a branch preview), save, and see it in the studio's Contributors map.
- **The suites:** `PARA_BASE=https://staging.para-commute.org` for the suites that accept a remote base (`tests/e2e/README.md`); note any that only run against a local build.
- **The owner** opens staging's three pages on a phone and says yes.

## Acceptance checks

- [ ] Every line above PASS, or a ticket for what failed.
- [ ] The owner's yes, in Comments.

## Comments

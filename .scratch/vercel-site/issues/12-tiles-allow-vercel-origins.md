# 12: The tiles Worker allows the Vercel origins

Status: ready-for-agent
Type: task
Who: Opus for the code; the owner deploys
Blocked by: none (07's first deploy confirms the address forms)

## The problem

`tiles.para-commute.org` answers CORS only for Para's own origins (`workers/tiles/src/cors.ts`): the `workers.dev` addresses, localhost, and `EXTRA_ORIGINS` (`www` and the bare domain). A page on `staging.para-commute.org` or a `*.vercel.app` preview would get no tiles: a blank basemap on every preview.

## What to build

- `workers/tiles/src/cors.ts`: add `https://staging.para-commute.org` to the fixed origins, and a preview pattern for this project's Vercel addresses only: `^https://para-[a-z0-9-]+-room-tba-oss-program\.vercel\.app$` (the branch and the unique-deployment forms both match it) and the production alias. The team is the owner's Pro team, slug `room-tba-oss-program`; confirm the exact preview and production-alias forms on 07's first deploy. No other team's `vercel.app` page may match. Keep the `workers.dev` entries until ticket 11.
- `tests/unit/` cases for the cors check: staging, a branch preview, a unique deployment, the production alias allowed; `para-x-otherteam.vercel.app` and `para-x-room-tba-oss-program.vercel.app.example.com` refused.
- `public/_headers` and `vercel.json`'s content policies already allow `https://tiles.para-commute.org`; no change there.

## Deploy

The tiles Worker deploys through Workers Builds (`workers/tiles/README.md`). With 01's watch path this PR is the only kind that builds. If November's minutes are still out, the owner deploys from a checkout of `main`: `cd workers/tiles && npx wrangler@4 deploy`.

## Acceptance checks

- [ ] `npm run check` passes.
- [ ] `curl -sI -H 'Origin: https://staging.para-commute.org' https://tiles.para-commute.org/styles/positron` shows `access-control-allow-origin: https://staging.para-commute.org`; the same with `https://example.com` shows none.

## Comments

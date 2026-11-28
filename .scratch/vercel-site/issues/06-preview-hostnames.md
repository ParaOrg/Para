# 06: Preview hostnames in the code

Status: paused 2026-11-27 (was ready-for-agent): the owner chose GitHub Actions → Cloudflare (`../spec.md`)
Type: task
Who: Sonnet
Blocked by: none

## What to change

- `src/shared/config/env.ts`, `isLiveDataPreview`: true for a host that ends `.vercel.app`, is `staging.para-commute.org`, or ends `.workers.dev` (kept until ticket 11). Still never in `apk` mode. Its comment names Vercel's previews and the staging domain.
- `tests/unit/live-data-preview-test.mjs`: a case each for `para-git-x-team.vercel.app`, `staging.para-commute.org`, `www.para-commute.org` (false), and `apk` mode (false).
- `scripts/research/load-test.mjs`: `DEFAULT_SITE = 'https://staging.para-commute.org'`.

## Acceptance checks

- [ ] `npm run check` passes.

## Comments

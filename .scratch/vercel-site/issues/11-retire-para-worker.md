# 11: Retire the para Worker

Status: paused 2026-11-27 (was needs-triage (after 10's 14 days)): the owner chose GitHub Actions → Cloudflare (`../spec.md`)
Type: task
Who: Opus for the code and docs; the owner deletes in Cloudflare
Blocked by: 10

## The owner

- Cloudflare → para-commute.org → Workers Routes: delete `www.para-commute.org/*`. Workers & Pages → `para` → delete (its two secrets go with it).
- Turnstile: remove any `workers.dev` hostname still listed.

## The code (one PR, then a second for the docs)

- Delete `wrangler.jsonc`, `public/_headers`, `public/.assetsignore`, the `_headers` drift check (03) and `isComingSoonHost` with its `workers.dev` cases.
- `git mv workers/site/src/*` to a folder beside `api/` (proposal: `server/site/`, kebab-case), drop `servePage` and `Env`; `api/report.ts` and `middleware.ts` import from there. Update `tests/unit/*-worker-test.mjs`, `tests/e2e/retire-pwa-test.mjs`, `report-stand-in.mjs`, the `typecheck`/`build` scripts and `areas.json`.
- `isLiveDataPreview`: drop `.workers.dev`. `strip-dist.mjs`: keep deleting `.vite/` only.
- Docs: `docs/operations.md` (where everything lives, addresses, costs, the runbooks' first checks, Branch previews), `README.md` (staging and preview links), `docs/system-design.md`, `docs/agents/how-we-work.md` (the preview address rule), `SECURITY.md`, `.env.production`'s comment, `scripts/watch/watch.mjs`'s hints, ADR 0007 (an amendment: the site's build is Vercel's; tiles unchanged), ADR 0011 → Accepted, and the owner's edits to `.claude/CLAUDE.md` from the spec.

## Acceptance checks

- [ ] `npm run check` and every browser suite pass.
- [ ] `grep -rn "workers.dev\|wrangler" --exclude-dir=node_modules . | grep -v workers/tiles | grep -v .scratch` finds nothing about the site.

## Comments

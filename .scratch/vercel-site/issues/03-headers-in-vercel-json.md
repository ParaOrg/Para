# 03: The headers move into vercel.json

Status: paused 2026-11-27 (was ready-for-agent): the owner chose GitHub Actions → Cloudflare (`../spec.md`)
Type: task
Who: Opus
Blocked by: 02

## What to build

- Every rule of `public/_headers` as a `headers` entry in `vercel.json`, same order, same values: `/assets/(.*)` immutable; `/(.*)` nosniff, Referrer-Policy, Permissions-Policy; `/` the map's report-only policy; `/studio/(.*)`, `/contribute/(.*)`, `/app/(.*)`, `/coming-soon/(.*)`, `/data/signboards/(.*)` as written. Note: Vercel's `/studio/(.*)` also matches `/studio/` itself; check `/` matches only `/`.
- `scripts/node/headers-file.ts` reads `vercel.json`'s `headers` (Vercel's `source` syntax: `(.*)`, `:name`, `:name*`) and gives the same `headersFor(rules, path)` answer. Where two rules set one header, Vercel keeps the later one; `headersFor` follows Vercel, and the guard fails a build where two rules matching one page set the same header (so the joined-vs-replaced difference can never matter).
- `content-policy.mjs` and `preview-policies.ts` read `vercel.json`, not `dist/_headers`. The printed hint says "add to … in vercel.json".
- `public/_headers` stays until ticket 11 for the Worker. A unit check proves `headersFor` gives the same headers for `/`, `/studio/`, `/contribute/`, `/app/`, `/coming-soon/`, `/assets/x.js`, `/data/signboards/x.svg`, `/data/index.v6.json`, `/sw.js` from both files, so the two cannot drift. Ticket 11 deletes the check with the file.
- `tests/unit/headers-file-test.mjs` updated to Vercel's syntax.

## Acceptance checks

- [ ] `npm run check` passes, and the policy guard still fails (with the hash to paste) when an inline script in `index.html` changes.
- [ ] On a preview: `curl -sI` of each path above shows the same headers as `www.para-commute.org` today (Cloudflare adds its own `server`, `cf-*`; ignore those). `/data/index.v6.json` and `/sw.js` answer `cache-control: public, max-age=0, must-revalidate`.

## Comments

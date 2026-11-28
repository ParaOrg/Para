# 05: /api/report as a Vercel Function

Status: paused 2026-11-27 (was ready-for-agent): the owner chose GitHub Actions → Cloudflare (`../spec.md`)
Type: task
Who: Opus
Blocked by: none

## What to build

- `api/report.ts`, Node runtime, `export async function POST(request: Request): Promise<Response>`, which reads `REPORT_DATABASE_URL` and `TURNSTILE_SECRET_KEY` from `process.env` (missing → 503 `unavailable`, as now) and calls `handleReport` from `workers/site/src/report.ts` with:
  - `isAllowed: async () => true` — the limit is the Firewall rule the owner sets in 07. The comment says so and names the rule;
  - `isVerified`: `isTurnstileVerified` unchanged;
  - `submit`: `submitRouteReport`, with `waitUntil` given as "await it": change `submit.ts` to take an optional `waitUntil`, and await `sql.end()` in `finally` when none is given. The Worker keeps passing `ctx.waitUntil`.
- Other methods answer 405 with `allow: POST`, as `handleReport` does (export only `POST`, and check Vercel's answer for GET matches; if not, export a `GET` that calls `handleReport` too).
- Nothing logs the body, the token, the address or the database's error, as now.
- `api/` gets a `tsconfig` (or joins `workers/site`'s), and `npm run typecheck` covers it.
- A unit test calls `POST` with a stubbed `process.env` unset → 503 `unavailable`.

## Acceptance checks

- [ ] `npm run check` passes.
- [ ] On a preview (no secrets): `curl -s -X POST <preview>/api/report -H 'content-type: application/json' -d '{}'` → `{"code":"unavailable"}`, 503.
- [ ] On production after 07 and 10: the same → `{"code":"bad_request"}`, 400; six quick posts from one address → the sixth is 429.

## Comments

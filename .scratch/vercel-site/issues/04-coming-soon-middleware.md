# 04: Coming soon as Routing Middleware

Status: paused 2026-11-27 (was needs-info: the owner's yes on `@vercel/functions`): the owner chose GitHub Actions → Cloudflare (`../spec.md`)
Type: task
Who: Opus
Blocked by: 02

## The question for the owner

The middleware's `rewrite()` comes from the package `@vercel/functions` (Vercel's own, small). It replaces nothing: on Cloudflare the Worker's runtime had this built in. Without it the middleware would set Vercel's undocumented `x-middleware-rewrite` header by hand. Add it?

## What to build

- `middleware.ts` at the root, default export (Vercel requires it; the one-line ESLint disable says so), `config.matcher` = the page addresses the Worker ran first for: everything but `/assets/`, `/data/`, `/icons/`, `/studio/`, `/contribute/`, `/coming-soon/`, `/app/fonts/`, `/api/`.
- When `process.env.VERCEL_ENV === 'production'`:
  - `/sw.js` → `retiringWorkerResponse()` from `workers/site/src/retiring-worker.ts`;
  - a page (last path part has no extension, or ends `.html`) that `showsComingSoon` does not keep → `rewrite('/coming-soon/')`, 200 at the same address;
  - anything else → `next()`.
- Otherwise (every preview, `staging`) → `next()`, so the map shows.
- The decision is a pure function in `workers/site/src/coming-soon.ts` (beside `servePage`), taking the path and whether it is production, so `tests/unit/coming-soon-worker-test.mjs` covers it under Node. The Worker's own `servePage` is unchanged (rollback).
- `tsconfig` coverage for `middleware.ts` and `npm run typecheck` includes it.

## Acceptance checks

- [ ] `npm run check` passes; unit tests: `/`, `/app/`, `/route/x` → Coming soon on production; `/studio/`, `/contribute/`, `/coming-soon/`, `/manifest.webmanifest`, `/old-app-cleanup.js` → passed through; `/sw.js` → the retiring worker; on a preview, everything passes through.
- [ ] `tests/e2e/retire-pwa-test.mjs` still passes (it drives `servePage`).
- [ ] After 07: the production `*.vercel.app` alias answers Coming soon at `/` and `/app/`, and the retiring worker at `/sw.js`; a PR preview shows the map.

## Comments

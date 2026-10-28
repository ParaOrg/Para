# 11: The contributor page opens with no signal

Status: resolved
Type: task
Wave: 4
Who: Sonnet
Blocked by: 01, 03

## What to build

`../spec.md`, "Offline, saving and sending".

- **Its own service worker,** scoped to `/contribute/`, precaching only the contributor page's chunks, cut from Vite's manifest as the public worker's precache is. Hand-written and small; no new dependency (ask first if one seems needed).
- **The public map's worker** keeps out of `/contribute/` (01 did the navigation part) and never precaches its chunks.
- **An update never reloads mid-recording:** the new worker waits until no recording is open.
- **Persistent storage** asked for (`navigator.storage.persist()`), and the answer kept for the Ready screen.
- **No install prompt and no manifest** for now: the page isn't an app of its own.

## Files it owns

The contributor page's worker and its registration in `src/app/contribute/`; this wave's build wiring (`vite.config.ts`, `scripts/checks/check-build.mjs`); a headless check in `tests/e2e/` (a new suite, or `pwa-test`'s pattern).

## Acceptance checks

- After one visit, with the network off, `/contribute/` opens and records.
- `check-build.mjs`: the contributor worker's precache holds no public-only and no studio chunk; the public worker's precache is as before.
- `pwa-test` and `gate-test` pass; `npm run check` passes.

## Comments

2026-10-26, status check on `staging`. Done. Evidence: `src/app/contribute/contribute-sw.ts` and `register-worker.ts`, `scripts/node/contribute-worker.ts` wired in `vite.config.ts` (public worker's `navigateFallbackDenylist` has `/contribute`), the worker check in `scripts/checks/check-build.mjs`, `src/features/contribute/persistent-storage.ts`, `tests/e2e/contribute-offline-test.mjs` (offline open and record, update waits while recording). No manifest, as asked. No migration.

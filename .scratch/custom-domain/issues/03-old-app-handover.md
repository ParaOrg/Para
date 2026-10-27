# 03: The old app's phones move to the new app

Status: ready
Type: task
Who: Sonnet
Blocked by: –

## Why

Phones that opened or installed "Para PH" at `https://www.para-commute.org` carry its offline worker: `/sw.js`, cache `para-ph-v20260912`, network-first for page loads, cache-first for `/assets/`, `skipWaiting` and `clients.claim` (read from the live site on 2026-10-27; a copy belongs in the test's fixtures). When the domain serves the new app, those phones get the new page online, but:

- `src/features/published-map/pwa.ts` reads `navigator.serviceWorker.controller` as "not a first visit", so our worker waits behind the old one and the commuter's first view of the new app shows the update prompt;
- our worker never deletes the `para-ph-*` cache.

## What to build

- The page tells the old worker from ours (for example, ours is Workbox's and the old one is not, or the old cache name exists) and, with the old one in control, lets ours take over as on a first visit: no prompt, no reload in the middle of a ride.
- Our public map's worker deletes caches named `para-ph-*` when it activates.
- A headless suite (or a case in `pwa-test`): serve the old `sw.js` from the fixture on the preview origin, open the page so it installs, swap in our build on the same origin, open again, and prove ours controls the page, no prompt showed, and `para-ph-v20260912` is gone. Then a second visit of ours behaves exactly as today's update flow.

Our own update path (a waiting version of ours shows the prompt) does not change. The contributor page's worker (`/contribute/sw.js`) is out of scope.

## Acceptance checks

- `npm run check` and the suites the change reaches, `pwa-test` included.
- The new suite fails on today's `staging` and passes with the change.

## Comments

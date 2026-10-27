# 04: Switch staging to our tiles

Status: in-review (the switch is built; the staging-side proofs wait on the site's move)
Type: task
Who: Sonnet
Blocked by: 02, 03

## What to build

The public map and the studio's Monochrome, Colour and Fiord designs read our tiles host on staging, and production keeps OpenFreeMap until the owner says otherwise:

- the basemap host is one value, parsed in `shared/config/env.ts` (`VITE_BASEMAP_HOST`), with OpenFreeMap as the fallback; `basemap.ts` builds its three URLs from it;
- the offline worker's two basemap rules in `vite.config.ts` match the configured host; `scripts/checks/check-build.mjs` follows;
- `index.html`'s preconnect, the attribution in `map-view.tsx` (keep © OpenMapTiles and © OpenStreetMap contributors), `basemap-control.stories.tsx`;
- the docs: `CONTEXT.md`, `docs/system-design.md`, and a new ADR (0007) recording that ParaPo serves its own basemap.

Then run `ready-for-100k` 03's load test against staging with the tiles host included (it is ours now), and a slow-phone first load beside OpenFreeMap's (`scripts/research/phone-speed.mjs`).

## Acceptance checks

- `npm run check` and every suite green; screenshots of the three designs on staging.
- Setting the host back to OpenFreeMap restores today's map with no other change.

## Comments

2026-10-27, builder session (PR into `staging`):

**Built.** `VITE_BASEMAP_HOST` (parsed in `src/shared/config/env.ts`, OpenFreeMap when unset) feeds `basemap.ts`, the offline worker's two basemap rules, the page's preconnect (`scripts/node/basemap-offline.ts`) and `check-build.mjs`; the credit line is `map-attribution.ts`; ADR 0007. `.env.production` names `https://parapo-tiles.para-ph-info.workers.dev`, so production switches only when the owner merges `staging` into `main`. Open item before that: a custom domain for the tiles host, so the edge cache is on.

**Proof.**
- `npm run check` green (1,167 unit checks, including `tests/unit/basemap-host-test.mjs`).
- Host set back to OpenFreeMap: `VITE_BASEMAP_HOST=https://tiles.openfreemap.org npm run build` passes `check-build`, the built page preconnects to OpenFreeMap, the worker holds no trace of our host, and the unit check compares the new rules with the old ones on a list of addresses (`basemapCacheRules`) and the three style addresses with today's literals.
- Screenshots of Monochrome, Colour and Fiord from a local production build (390×844, Metro Manila at the opening view), every request going to our tiles host, none failing: `04-screenshots/`.

**Tiles host, straight (300 random tiles from the 145 in the central box, zooms 11–14, from the build container, origin `http://localhost:5173`):**

| Pass | Concurrency | Median | 90th | 99th | Slowest | `cf-cache-status` |
| --- | --- | --- | --- | --- | --- | --- |
| first (cold) | 8 | 292 ms | 721 ms | 1,810 ms | 2,056 ms | none |
| second | 8 | 54 ms | 82 ms | 100 ms | 109 ms | HIT |
| burst | 32 | 77 ms | 155 ms | 463 ms | 473 ms | HIT |

All 200, no errors. The 145 tiles were 35.5 MB decoded, about 245 kB each. The `HIT` is the Worker's own Cache API (workers.dev has no zone cache, so this is per data centre).

**Credits.** Our Worker's styles carry no source `attribution`; the app's `map-attribution.ts` holds the credit alone (hub review, 2026-10-27), so nothing repeats.

**Not done.**
- `ready-for-100k` 03's load test does not exist yet (no `scripts/research/load-test.mjs`), and the staging site is not deploying until the site Worker moves; run it with the tiles host included once both exist.
- `phone-speed.mjs` serves OpenFreeMap's files from a curl-fed cache keyed to that one host; timing ours beside it needs the script taught a second host, which is its own change.
- Side-by-side screenshots against OpenFreeMap's, and the first-load comparison on a slow phone, wait for the same.
- `tests/e2e` suites run with OpenFreeMap as the host (CI pins it in `.env.local` and in the two preview builds); none was run against our host.

# 04: Switch staging to our tiles

Status: needs-info (waits on 02 and 03)
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

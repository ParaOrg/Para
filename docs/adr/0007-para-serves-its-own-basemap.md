---
status: accepted
date: 2026-10-27
---

# ParaPo serves its own basemap

Every commuter's map drew its streets, buildings and place names from
OpenFreeMap (`tiles.openfreemap.org`): the Monochrome, Colour and Fiord designs
are its Positron, Liberty and Fiord styles. OpenFreeMap is free, run on
donations and promises no uptime. At 100,000 commuters it was the one part of a
visit ParaPo did not control. On 2026-10-27 the owner chose to own the tiles
(`.scratch/own-tiles/spec.md`, `ready-for-100k` 02).

ParaPo now builds a Metro Manila extract of OpenStreetMap into one PMTiles file
every month (`.github/workflows/tiles.yml`, to zoom 14, the OpenMapTiles
schema), keeps it in Cloudflare R2, and serves it from a Worker
(`workers/tiles/`). The Worker also serves OpenFreeMap's three styles, copied
and pointed at its own tiles, sprite and glyphs.

The app reads all of it from one **basemap host**, `VITE_BASEMAP_HOST`, parsed
in `src/shared/config/env.ts`. Unset, it is OpenFreeMap. Both servers answer
`/styles/<name>`, so `basemap.ts` builds the three style addresses from the host
alone. The offline worker's two basemap rules and the page's preconnect follow
the same value (`scripts/node/basemap-offline.ts`, `vite.config.ts`), and
`scripts/checks/check-build.mjs` proves the built worker and page name the
configured host.

## Consequences

- **Staging first, `main` later.** The site's build variables are committed in
  `.env.production` (Cloudflare's build has no environment variables), so the
  value is set there on `staging` and reaches production only when the owner
  merges `staging` into `main`. Until then production keeps OpenFreeMap.
- **Going back is one line.** Remove `VITE_BASEMAP_HOST` from `.env.production`
  (or set it to `https://tiles.openfreemap.org`) and the map is OpenFreeMap's
  again, with nothing else changed. `tests/unit/basemap-host-test.mjs` proves
  the three addresses and the worker's rules are exactly what they were.
- **Open item before `main`: a custom domain.** The tiles Worker is on
  `workers.dev`, where Cloudflare's edge cache is off, so every tile is an R2
  read. A domain of ParaPo's own turns the cache on; production should get one
  before it switches. The host and `EXTRA_ORIGINS` in `workers/tiles/wrangler.jsonc`
  change together.
- **Phones keep OpenFreeMap's cached tiles** under the same cache name until
  they age out (30 days) or the 1,000-entry cap pushes them out; the first view
  on our host downloads its tiles once.
- **Credits.** The app holds the credit (`map-attribution.ts`): the corner
  keeps © OpenStreetMap contributors and the route data's ODbL line, drops
  OpenFreeMap (no longer the provider) and adds © OpenMapTiles, each with its
  link. The Worker's styles carry no source `attribution`, so nothing repeats
  them; they are served to ParaPo's own origins only.
- **Satellite and Terrain stay as they were.** The studio's two extra designs
  read their own providers (`studio-basemaps.ts`).
- **Tests.** The browser suites stub `tiles.openfreemap.org`, so they must run
  with OpenFreeMap as the host. Locally the dev server does, since it reads no
  `.env.production`. CI copies `.env.production` to `.env.local`, so each of its
  steps that does so then sets `VITE_BASEMAP_HOST=https://tiles.openfreemap.org`;
  the two suites that run a production build (`pwa-test`,
  `contribute-offline-test`) name OpenFreeMap in their build step as well, since
  their preview origins are not ones the tiles server allows. No suite depends
  on ParaPo's live tiles server; the built output is checked by `check-build.mjs`
  against the committed host.

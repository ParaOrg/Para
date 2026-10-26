# 02: The basemap at 100,000 users

Status: ready-for-agent (research first; the decision is the owner's)
Type: research
Who: Sonnet, then the owner decides

## The question

Every commuter's map loads basemap tiles from `tiles.openfreemap.org` (OpenFreeMap's Liberty style, `CONTEXT.md`; the offline worker caches them, `scripts/checks/check-build.mjs`). At 100,000 users, should ParaPo:

- **A.** stay on OpenFreeMap as it is;
- **B.** stay, and support it (OpenFreeMap takes donations and sponsorships);
- **C.** serve the tiles itself, e.g. a Metro Manila extract as PMTiles on Cloudflare R2 or the site's static assets, with the same style?

## What to find out

From OpenFreeMap's own pages (primary sources only, with links and dates):

- its stated usage policy and any limits, and what it asks of heavy users;
- whether it promises uptime, and its history of outages if published.

For C:

- the size of a Metro Manila (or Luzon) extract at the zooms the map uses;
- where it would live and what that costs at 100,000 users a month;
- how the tiles get updated, and the work to switch: the style URL, the offline worker's cache rule, `check-build.mjs`, the attribution;
- the effect on the first load on a cheap phone.

## Output

A short write-up under `## Answer` with a recommendation and its cost. No code changes. The owner then picks A, B or C. If C, the hub writes the build ticket.

## Comments

## Answer

**Recommendation: B for now.** OpenFreeMap says its public tiles have no map-view or request limit, allows commercial use, and asks users who benefit to support it with recurring donations. Its terms cap each explicit offline-area download at 3,000 tiles or 50 MB, with at most four parallel requests. ParaPo's current worker caches tiles as commuters view them, rather than downloading a selected area, so that cap is not a limit on normal use. OpenFreeMap offers no SLA or personalized support, and says it may discontinue the service; I found no published outage history in the official pages checked. ([OpenFreeMap](https://openfreemap.org/), [terms](https://openfreemap.org/tos/), checked 2026-10-26.)

That makes 100,000 monthly commuters a weak reason by itself to move. Supporting OpenFreeMap now keeps the existing three map styles and offline behavior, with no tile-hosting bill or tile pipeline for ParaPo to operate. The remaining risk is reliance on a free service with no availability guarantee.

**C is feasible, but not yet costed precisely.** The repo has no Metro Manila PMTiles build or measured archive. The existing plan estimates commuters cache about 30–100 MB of viewed Metro Manila tiles, with roughly 110 tiles at z14; one measured tile over SM Fairview is 253 kB. Treat 30–100 MB as a phone-cache estimate, not the size of a generated PMTiles archive. The public map's first phone view currently downloads about 397 kB of basemap. A same-data PMTiles archive should not be assumed to reduce that first-load transfer. Build an actual Metro Manila archive and test it on a cheap phone before choosing C. ([map framing](https://github.com/ParaOrg/Para/blob/staging/src/features/routes/map/framing.ts), [tile measurements](https://github.com/ParaOrg/Para/blob/staging/PLAN.md), checked 2026-10-26.)

If C is chosen, use a Cloudflare R2 bucket behind a custom domain and cache, with either direct range access or a Worker serving Z/X/Y. R2 includes 10 GB-month storage and 10 million Class B reads per month; beyond that, storage is $0.015/GB-month and reads are $0.36/million. Egress is free. As a rough ceiling, 100,000 commuters making 100 uncached range reads each would be 10 million reads; CDN hits reduce R2 reads, while PMTiles metadata and directory reads count too. A Worker adds its own plan/request costs if used. ([R2 pricing](https://developers.cloudflare.com/r2/pricing/), [PMTiles cloud storage](https://docs.protomaps.com/pmtiles/cloud-storage), [Cloudflare deployment](https://docs.protomaps.com/deploy/cloudflare), checked 2026-10-26.)

The switch would cover the Liberty, Positron and Fiord style URLs plus sprites, fonts and glyphs; update the service worker's current Z/X/Y cache rule and `check-build.mjs`; retain OpenStreetMap/OpenMapTiles attribution; and add a repeatable extract build, upload and update process. PMTiles uses byte-range requests, so range CORS, cache behavior, cold-load latency and offline reuse need testing. Protomaps warns that R2 can have 500 ms or higher origin latency and that caching requires a custom domain. This is a separate implementation ticket once the owner chooses C.

Sources are primary project and provider docs. OpenFreeMap and Cloudflare pricing/terms may change; recheck before implementation.

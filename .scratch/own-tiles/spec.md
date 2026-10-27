# Own the map tiles

Written 2026-10-27, after the owner's choice in `ready-for-100k` 02: "we're planning to own the map tiles", then "go". That ticket's research is in PR #411.

## Why

Every commuter's map draws its streets, buildings and place names from OpenFreeMap (`tiles.openfreemap.org`): the Monochrome, Colour and Fiord designs are its Positron, Liberty and Fiord styles (`src/features/routes/map/basemap.ts`). OpenFreeMap is free, run on donations, and promises no uptime; it may stop. At 100,000 commuters it is the one part of a visit ParaPo does not control. Owning the tiles gives:

1. **No outside point of failure.** Only Cloudflare, which already serves the site.
2. **A real offline map.** OpenFreeMap caps an offline-area download at 3,000 tiles or 50 MB. Ours has no cap, so a "Save Metro Manila map" download becomes possible (05).
3. **Privacy.** A tile request says where a commuter is looking. It stays with ParaPo (in the spirit of ADR 0004).
4. **A map shaped for commuting.** We choose the layers and the update day; a style change upstream cannot change our map.
5. **A predictable cost.** About $5–15 a month at 100,000 commuters (below), and no load on a donation-run service.

## What owning means

| Today | Owned |
| --- | --- |
| Vector tiles from OpenFreeMap's `/planet` (OpenMapTiles schema, to zoom 14) | The same schema, built by us from OpenStreetMap for the area our routes reach, to zoom 14 |
| Styles, sprites and glyphs from OpenFreeMap | Copies on our host, pointing at our tiles; licences checked |
| `tiles.openfreemap.org` | A tiles subdomain of ours: a Cloudflare Worker reading one PMTiles file in R2, each tile cached at Cloudflare's edge |
| OpenFreeMap updates weekly | A monthly rebuild in GitHub Actions, with its build date and a failure alert |

The client keeps ordinary `{z}/{x}/{y}` tile addresses, so MapLibre needs no new library and the offline worker's cache rules keep their shape (`vite.config.ts`). The file goes in R2 because a static asset on Cloudflare is capped at 25 MiB.

Not in scope: the studio's Satellite and Terrain designs (`src/features/studio/drawing/studio-basemaps.ts`) stay on their providers.

## Cost (to be rechecked before 02 and 03)

| Item | Estimate |
| --- | --- |
| R2 storage | ~$0: tens of MB to a few GB, inside the free 10 GB-month |
| Egress | $0 (R2 and Cloudflare charge none) |
| Worker | ~$5–10/month: $5 plan with 10M requests, then $0.30 per million; 100k commuters × ~4 visits × ~50 tiles ≈ 20M requests |
| R2 reads | ~$0: a few hundred tiles at z14 for Metro Manila, so nearly all requests are cache hits |
| Monthly build | $0–few dollars of Actions minutes |

The larger cost is time: about one to two weeks of builder work, then upkeep of the monthly build.

## Risks and answers

| Risk | Answer |
| --- | --- |
| We are on call for the background | The basemap host is one config value; switching back to OpenFreeMap is a one-line revert. A health check pings the tiles host. |
| The extract's edge | Cover the box around every published route plus a margin; a wider area later is a bigger build, not a redesign. |
| Stale data | The build fails loudly, and the file carries its build date, which a check reads. |
| Styles mismatch | Planetiler's OpenMapTiles profile, the schema OpenFreeMap uses; side-by-side screenshots of all three designs before the switch. |
| Fonts and sprites forgotten | Host them too, or we still depend on OpenFreeMap. |
| Cold edge latency (R2 can be 500 ms+) | Edge cache per tile; measured on a slow phone profile before the switch. |
| Phones' cached tiles go stale once | One re-download (~400 kB first view), timed with a release. |
| Hotlinking | Allow our origins only, rate-limit, cache. |
| Licences | Keep "© OpenMapTiles" and "© OpenStreetMap contributors" in the map's attribution (`map-view.tsx`). |

## Tickets

| # | Ticket | Who | Blocked by |
| --- | --- | --- | --- |
| 01 | [Spike: build Metro Manila tiles and measure them](issues/01-spike-build-and-measure.md) | Sonnet | – |
| 02 | [The monthly build and upload to R2](issues/02-monthly-build-to-r2.md) | Sonnet | 01; owner: R2 bucket and token |
| 03 | [The tiles Worker on our subdomain](issues/03-tiles-worker.md) | Sonnet | 01; owner: subdomain, Worker approval |
| 04 | [Switch staging to our tiles](issues/04-switch-staging.md) | Sonnet | 02, 03 |
| 05 | [Save the Metro Manila map offline](issues/05-offline-metro-manila.md) | later | 04; owner: design |

Main moves only on the owner's word. Until 04 is proven on staging, OpenFreeMap stays, and the owner may still donate to it (option B) in the meantime.

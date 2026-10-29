# 04: The code for the domain

Status: resolved (#423, merged 2026-10-28; released in #468)
Type: task
Who: Sonnet
Blocked by: – (merge waits on 02)

## What to build

- `workers/tiles/wrangler.jsonc`: `EXTRA_ORIGINS` = `https://www.para-commute.org,https://para-commute.org`, with a tiles unit test for both and a look-alike refused.
- `.env.production`: `VITE_BASEMAP_HOST=https://tiles.para-commute.org` in place of the `workers.dev` address (ADR 0007's open item). The `workers.dev` address keeps working; nothing else points at it.
- ADR 0007: the open item closed, the cache on. `workers/tiles/README.md`: the custom domain and the rate-limit rule as done. Root `README.md`: the map's address is `https://www.para-commute.org`; staging stays on `workers.dev`.
- Anything else that names the live address for a reader to act on (grep `para.para-ph-info` and `villaralvorovic2`); records of their time stay.

Built now, merged into `staging` only after 02 is Active and 05's custom domains answer, since `tiles.para-commute.org` must exist before staging asks it for tiles.

## Acceptance checks

- `npm run check`; `check-build` names `tiles.para-commute.org` in the built page and worker.
- After merge, staging's map draws from `tiles.para-commute.org`, and `cf-cache-status: HIT` shows on a repeated tile.

## Comments

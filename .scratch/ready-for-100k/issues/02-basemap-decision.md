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

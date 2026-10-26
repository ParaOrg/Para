# Ready for 100,000 users

Written 2026-10-26, from the owner's question "we're preparing for 100,000 users, can we cater to that?"

## Where the load lands

- **Commuters (the public map at `/`)** read static files only: the site and the published map (`/data/index.v5.json` and the line files), served by Cloudflare from `dist/` (`wrangler.jsonc`, static assets, no Worker script). They never read the database (ADR 0001). 100,000 commuters add no load to Supabase.
- **The basemap** (streets, buildings, place names) comes from OpenFreeMap's public tile server, `tiles.openfreemap.org`. It is free and run on donations, and ParaPo has no agreement with it. This is the one part of a commuter's visit that ParaPo doesn't control.
- **Contributors and editors** sign in to Supabase and write to it: accounts, ride recordings, drafts. Each signed-in person counts toward the plan's monthly active users, and recordings grow the database.

## What "ready" means

1. The Supabase plan's limits cover the expected contributors, with room to spare (01).
2. The basemap has a decision behind it: stay on OpenFreeMap and support it, or serve the tiles ourselves (02).
3. A load test on staging shows the public map's own files hold up at launch traffic (03).

No new services: Redis and the like aren't needed, since there is no ParaPo server to cache for.

## Tickets

- `issues/01-supabase-plan-limits.md`: the owner
- `issues/02-basemap-decision.md`: research, then the owner's decision
- `issues/03-load-test-on-staging.md`: an agent

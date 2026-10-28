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

## Ready to launch (added 2026-10-28)

The basemap question is settled: Para serves its own tiles (ADR 0007). A readiness check on 2026-10-28 found the app ready and the operations around it not yet: nothing alerts anyone when something breaks, the tiles Worker has a daily cap, there is no public privacy policy, and what lives where is known only to the owner. Tickets 04 to 08 close those.

## Tickets

| # | Ticket | Who | Blocked by |
| --- | --- | --- | --- |
| 01 | [Supabase plan limits](issues/01-supabase-plan-limits.md) | Owner | – |
| 02 | [The basemap decision](issues/02-basemap-decision.md) (resolved) | – | – |
| 03 | [Load test of the map and its tiles](issues/03-load-test-on-staging.md) | Opus | Full run: Workers Paid (07) |
| 04 | [Tell the owner when something breaks](issues/04-alerts.md) | Opus | – |
| 05 | [The operations handbook](issues/05-operations-handbook.md) | Opus | – |
| 06 | [The privacy policy](issues/06-privacy-policy-draft.md) (the owner's document, 2026-10-29) | Owner, then Opus checks it against the code | – |
| 07 | [The owner's launch settings](issues/07-owner-launch-settings.md) | Owner | Rate limit: 03 |
| 08 | [Errors on commuters' phones](issues/08-phone-error-reports.md) | Owner decides | – |

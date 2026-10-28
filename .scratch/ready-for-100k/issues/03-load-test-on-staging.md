# 03: A load test of the public map on staging

Status: ready-for-agent
Type: task
Who: Sonnet

## What to build

A load test that plays commuters opening the public map, run by hand against the **staging** site only, never production:

- each simulated visit fetches what a first visit fetches from ParaPo's own host: the page, its scripts and styles, `/data/index.v5.json` and a few line files;
- ramp up to a launch-day peak (for example 100,000 visits spread over a day, with a busy hour at ten times the average), then hold;
- report the response times (median and slowest 1%), errors, and whether Cloudflare served from its cache.

**Leave out every third-party host:** no requests to `tiles.openfreemap.org`, Supabase, or the router. Load-testing someone else's free service is not ours to do. 02 covers the basemap.

No new dependency without the hub asking the owner first. A plain Node script with `fetch`, in `scripts/research/`, is the default.

## Files it owns

`scripts/research/load-test.mjs` (or similar), its README lines.

## Acceptance checks

- One run against staging, with its numbers written under `## Comments`.
- Any error or slow file found is named, with what would fix it.

## Comments

# 03: A load test of the public map and its tiles

Status: ready-for-agent
Type: task
Who: Opus

Rewritten 2026-10-28: Para now serves its own tiles (ADR 0007), so the test covers them too.

## What to build

A load test that plays commuters opening the public map, run by hand:

- **Each simulated visit** fetches what a first visit fetches:
  - the page, its scripts and styles, `/data/index.v5.json` and two or three line files, from the **staging** site;
  - about 30 tiles around a Metro Manila spot at zooms 12 to 15, plus the style, from **`https://tiles.para-commute.org`**.
- **Pick the tiles from real commuter spots** (hotspots in the published index), so the edge cache sees the overlap real commuters make.
- **Ramp up** to a launch-day peak, for example 100,000 visits spread over a day with a busy hour at ten times the average, then hold.
- **Report:**
  - response times (median and slowest 1%) and errors, for the site and for tiles separately;
  - the edge cache's share of hits (`cf-cache-status`);
  - an estimate of Worker requests and R2 reads per 1,000 commuters.

**Why `tiles.para-commute.org` and not the `workers.dev` address:** the edge cache keeps nothing on `workers.dev` (`workers/tiles/src/edge-cache.ts`), so a test there would understate the real speed.

**Leave out every third-party host:** no OpenFreeMap, no Supabase, no router.

## The budget (read before running)

The tiles Worker is one Worker for staging and production, and the Free plan allows 100,000 requests a day. Past that, every commuter's street map stops loading until the next day.

- **Until the hub says Workers Paid is on:** at most **2,000 tile requests** in total, across every run. That's a smoke run that proves the script, gives first numbers, and uses 2% of the day.
- **After Workers Paid:** the full ramp. Say in the PR how many requests it used.
- **If the tiles rate-limit rule exists** when you run, stop and tell the hub: a test from one machine would be blocked by it.

The static site's files are free and uncapped, so they need no budget.

## Rules

- No new dependency. A plain Node script with `fetch`, in `scripts/research/load-test.mjs`.
- Never run it from CI, and never on a schedule.

## Files it owns

`scripts/research/load-test.mjs` and its README lines.

## Acceptance checks

- The smoke run's numbers are under `## Comments`, with the request count it used.
- Every error or slow file found is named, with what would fix it.
- The command for the full run, ready for when Workers Paid is on.

## Comments

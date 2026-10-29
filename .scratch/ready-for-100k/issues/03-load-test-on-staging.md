# 03: A load test of the public map and its tiles

Status: in progress
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

### 2026-10-28: the script and the smoke run (Workers Free)

`scripts/research/load-test.mjs` is built. Each visit fetches the page, the scripts and styles it names, `/data/index.v5.json` and two or three line files from the site, then the positron style and 29 tiles around a random hotspot from the index (2×2 at zoom 12, 3×3 at 13, 4×4 at 14), at the tile address the style gives. Every request to the tiles host is counted against `--tile-budget` before it is sent, and a 429 or a Cloudflare block stops the run.

**Tile requests used today: 1,471 of the 2,000 budget.** Two one-visit development runs (32 and 31) and one smoke run (1,408). Every request to the tiles host is in these counts; no other tile request was made. No 429 and no block page at any point. The smoke run reached about 15 requests a second, so it proves nothing either way about a rate-limit rule.

**The smoke run:** `--peak 0.5 --ramp 60 --hold 60`, 44 visits in 122 s, from this cloud container through its proxy. It ran the script's **first grid**: per visit, the style and 31 tiles (2×2 at zoom 12, 3×3 at 13, 14 and 15), 32 requests. That version fetched no style before the clock started, so 44 × 32 = 1,408 is the whole run. The script was changed afterwards (see Zoom 15), and the current grid has not had a smoke run of its own; the 31-request check run is one visit of it: the setup style, then the style and 29 tiles.

| | Requests | Median | Slowest 1% | Errors | Edge cache hits |
| --- | --- | --- | --- | --- | --- |
| Site (staging) | 640 | 216 ms | 1,041 ms | 0 | 95.6% |
| Tiles, zooms 12 to 14, and the style (44 × 23) | 1,012 | 209 ms | 1,626 ms | 0 | 74.2% |

- **Tiles:** a hit takes a median 195 ms and a miss (made by the Worker from R2) 592 ms. The style was a hit 40 times out of 44.
- **Where they were served:** the proxy's exits reached six Cloudflare data centres (Stockholm 77%, then Rio, Warsaw, Tokyo, São Paulo and Paris). Each data centre keeps its own cache, so the hit share here is lower than for commuters, who all land in Manila. Stockholm alone: 83% hits. These times are from Europe and South America, not from a phone in Manila, so they measure the servers, not a commuter's wait.
- **Zoom 15:** the smoke run also asked for 396 zoom-15 tiles. All were `204`: the archive stops at zoom 14 and MapLibre draws closer zooms from z14 tiles, so a real map never asks for them. The script now reads `maxzoom` from the style and keeps to it (the 31-request check run). These 396 (44 × 9) are left out of the table, which is why it shows 1,012 of the 1,408.

**Per 1,000 commuters (first visits; a repeat visit has its tiles in the browser for a day). A projection for the current grid, the style and 29 tiles a visit, using the smoke run's hit share; not measured with it:**

- **Worker requests:** 30,000 (one style and 29 tiles each). The site adds none: it is static assets with no Worker script. So 100,000 first visits a day is about 3,000,000 Worker requests, 30 times the Free plan's daily cap. **Workers Paid is required for launch**, not only for the full test.
- **R2 reads:** about one for each tile miss, so roughly 7,700 if the current grid saw the smoke run's 26% misses. That is the upper end: with every commuter on the Manila data centre, and the same terminals asked for again and again, misses should fall well below that. The full run will measure it.

**Errors and slow files, named, with what would fix them:**

1. **The documented staging address is down.** `https://staging-para.para-ph-info.workers.dev` (README, and the Worker's CORS list) answers Cloudflare's own 404 page for `/` and `/data/index.v5.json`. The run used the old account's staging, `https://staging-parapo.villaralvorovic2.workers.dev`, which still serves a `staging` build. Fix: the owner turns on the `staging` branch's preview for the `para` Worker on the new account, or the README says which address is staging now. The script's `--site` takes either.
2. **Tile misses are three times slower than hits** (592 ms median against 195 ms). The slowest file was a z12 tile, `12/3425/1879` (215 kB once unzipped), at 4.0 s, a miss served in Rio. Nothing in the Worker is wrong here; it is R2 being read from far away. Fix, if the full run shows the same in Manila: warm the Manila cache after each monthly build by fetching Metro Manila's z12 to z14 tiles once (a few thousand requests, a later ticket).
3. **The site:** no errors. The slowest files were first fetches (misses) of `assets/shared-*.css` (172 kB, 1.4 s) and the page itself (1.2 s) at Tokyo and São Paulo. Hashed assets are cached for a year, so only the first commuter at each data centre waits for them. Nothing to fix.

**The full run, once the hub says Workers Paid is on.** This is the launch day's busy hour: 100,000 visits a day, with the busy hour at ten times the average, is 11.6 visits a second. The run climbs to that over 10 minutes and holds it for 30. That is about 24,400 visits and **about 731,000 tile requests**:

```
NODE_USE_ENV_PROXY=1 node scripts/research/load-test.mjs \
  --site https://staging-parapo.villaralvorovic2.workers.dev \
  --peak 11.6 --ramp 600 --hold 1800 --tile-budget 750000 \
  --json load-test-full.json
```

Drop `NODE_USE_ENV_PROXY=1` on a home connection. If a tiles rate-limit rule is on by then, it will block this run from one machine within seconds, and the script stops at the first 429. The rule needs an exception for the test, or the test runs before the rule is added.

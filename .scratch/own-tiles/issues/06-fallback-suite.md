# 06: A suite for the basemap fallback, against the own-tiles stand-in

Status: needs-triage
Type: task
Who: Sonnet, fully specified below; Opus reviews
Blocked by: #962 merged. Run it when the basemap is next touched, not before

## Why

When Para's own basemap host does not bring the opening style, the map draws the same design from
OpenFreeMap, once, and its credits name OpenFreeMap while it does (#962:
`src/features/routes/map/basemap-failover.ts`, `basemap-host-drawing.ts`). That path is held by unit
checks (`tests/unit/basemap-failover-test.mjs`, `basemap-host-drawing-test.mjs`) and was tried by
hand in a browser with both hosts answered by a stand-in. No headless suite makes the own host fail,
so a change to how `MapView` opens its style could break the fallback and stay green.

## What to build

One short suite, `tests/e2e/basemap-fallback-test.mjs`, on a build made with
`VITE_BASEMAP_HOST=http://127.0.0.1:4390` (the own-tiles stand-in, `tests/e2e/own-tiles-stand-in.mjs`),
the build pwa-test's own-tiles run already uses.

1. The own host healthy: the map loads, no request goes to OpenFreeMap for a style, the Map Data
   Source sheet's third row says "© OpenMapTiles".
2. The own host failing its styles (the stand-in answering 503 for `/styles/*`, by an option to
   `startOwnTilesStandIn`, not by a Playwright route: see the stand-in's header for why): the map
   loads, there is no "The map failed to load." box, the console has the one `[map]` warning, and
   the sheet's third row says "OpenFreeMap" with its link.
3. Both failing: the failure box, after one request for a style at each host.

OpenFreeMap's side is the suite's own stand-in too (a second loopback server, or the same one on a
second port), so the suite never depends on the real OpenFreeMap being up.

## Where it runs

In `ci.yml`'s preview suites, beside pwa-test's own-tiles run, for a change to
`src/features/routes/map/**`, `src/shared/config/basemap-host.ts`, `tests/e2e/own-tiles-stand-in.mjs`
or the suite itself. `tests/e2e/README.md` gets its line.

## Not in scope

- The real OpenFreeMap or the real tiles server: no suite reaches either for this.
- A design switched after the opening: it does not fall back today (#962's body says so).

## Comments

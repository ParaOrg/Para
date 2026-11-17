# commuter-test: a fresh page's map waits on OpenFreeMap, a live outside host

Status: needs-triage
Type: task
Priority: low

## What happened

On #1022, CI run 43892917489, job 133388821237, `commuter-test (6 of 6)` passed all of section
5, then section 6's fresh page timed out:

```
PASS  the map came from /data/index.v5.json, fetched once and served  1 response(s): 200
page.waitForFunction: Timeout 30000ms exceeded.
    at waitForMap (tests/e2e/commuter-test.mjs:1918:7)
```

The same part passed 406 of 406 twice locally on that branch, and the change (how the page
takes index.html's early map-file request) is not on this path: the route index had loaded.
The job's artifact holds only vite.log, so what was pending is not recorded.

## Why it can happen

`waitForMap` waits for `window.__map.loaded()`, which is true only once the style and every
tile in view have loaded. In CI the commuter job writes
`VITE_BASEMAP_HOST=https://tiles.openfreemap.org` (ci.yml, the browser-suite jobs), and
commuter-test does not swap in `bareStyle`, so every page it opens fetches its style, sprite,
glyphs and tiles live from OpenFreeMap. A slow or failed answer there holds `loaded()` false
past 30 s. This is the same kind of fragility as the drawing suites' live OSRM router: a free
outside service, outside our code.

Section 6 (Location Labels) needs a real basemap, because it checks that the basemap's own
labels hide and show; the other sections only need a map that draws.

## Options

- Serve the basemap from a local stand-in in CI, as pwa-test's own-tiles run already does
  (`tests/e2e/own-tiles-stand-in.mjs`, `VITE_BASEMAP_HOST=http://127.0.0.1:4390`), with
  OpenFreeMap kept for staging, main and the nightly run.
- Or use `bareStyle` for every commuter page except section 6's.

Either is a CI change (the .github rule applies) and a decision for the hub and the owner.
Until then, a `waitForMap` timeout after section 5 has passed points here first.

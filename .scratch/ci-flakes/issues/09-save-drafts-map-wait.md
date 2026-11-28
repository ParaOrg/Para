# save-drafts-test: the reload into an open drawing waits on map.loaded(), which the chevrons' flow holds false

Status: resolved ([#1293](https://github.com/ParaOrg/Para/pull/1293))
Type: task
Priority: medium

## What happened

Twice on 2026-11-27, in the merge queue, `save-drafts-test` stopped at the same step: the
`load()` that reloads the studio after section 4's signboard upload.

```
page.waitForFunction: Timeout 30000ms exceeded.
    at load (tests/e2e/save-drafts-test.mjs:161:14)   # #1264, merge_group 45927406469, job 140271958156
    at load (tests/e2e/save-drafts-test.mjs:167:14)   # #1289, merge_group 45995026745, job 140492554705
```

Neither PR touched that path, and both passed locally (#1289: 78/78 twice). The suite has no
crash handler (save-studio.mjs's isn't imported here), so neither run kept a screenshot or trace.

## Why

`load()` waits for `window.__map.loaded()`. It is the one reload in the suite that opens into a
drawing: the drawing kept on the device reopens into editing, with drawn segments. The drawing's
direction chevrons flow (`flowChevrons`, used by `src/features/studio/drawing/draw-arrows.ts`), and
the flow re-sets the `draw-arrows` source every frame. MapLibre's `loaded()` is false while any
source has data in flight, so with a drawing open it is true only in the gaps between frames.

Measured locally on that reload: `draw-arrows` fired 136 data events in 2 s and was still loading
when read; every other reload in the suite fired none from it. `waitForFunction` polls on
animation frames, so a fast machine catches a gap (the wait took 0.2–0.5 s; 1–3 s with the CPU
throttled 6×). A busy queue runner, with the worker behind on every setData, can miss every gap
for 30 s.

## Fix

- The suite's page runs with `reducedMotion: 'reduce'`: the chevrons stand still, drawn once, so
  the source settles. No check in save-drafts-test reads the flow (the chevron suites are
  commuter, contribute, group, phone, snap and studio-scale).
- `load()` now says, on a timeout, what the map is still waiting on (the sources loading, and the
  data events per source in 2 s) and keeps a screenshot, so a source that never settles is named.

## Elsewhere

Any suite that reloads into an open drawing and then waits on `map.loaded()` has the same exposure:
studio-osm-start-test's reload ("a reload keeps the drawing") is one. It has not failed; if it
does, the same fix applies.

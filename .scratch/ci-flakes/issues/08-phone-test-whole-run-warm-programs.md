# phone-test run whole (one part) stops at endClearsFooter: "source warm-programs loading"

Status: needs-triage
Type: task
Priority: low

## What happened

Run as one part (`PHONE_PART` unset, so `1/1`), phone-test stops partway on unchanged `staging`. It's an uncaught error, not a FAIL line, so the suite never prints its count:

```
Error: mapIdle: the map not at rest after 10000 ms: source warm-programs loading
    at mapIdle (tests/e2e/lib/harness.mjs:241:21)
    at async cardsSettled (tests/e2e/lib/harness.mjs:299:3)
    at async endClearsFooter (tests/e2e/phone-test.mjs:2809:3)
    at async tests/e2e/phone-test.mjs:5254:11
```

CI never shows it: CI runs phone-test as `PHONE_PART=1/3`, `2/3` and `3/3`, and each part passes on its own.

## Measured here (Linux, 2026-11-24)

The setup each time: a dev server on its own port, Playwright 1.65 with the pre-installed Chromium, every outside request stood in.

**Whole run, 3 of 3 stopped, at the same line and with the same error:**
- 2 runs on `claude/explore-cards` (#1192, since merged), whose own change doesn't touch the trip, the sheets or the map's sources.
- 1 run on plain `staging` 4a1d4b4.

**The same code in CI's three parts, 3 of 3 passed:** on `claude/explore-cards`, 48 / 27 / 56 passed, 0 failed (1 and 2 skipped). That's the same counts as the release test on `staging` 0b93b43.

## Where it stops

- **`tests/e2e/phone-test.mjs:5254`**, in the `runsPart(1)` block at line 5214, "a trip opened by a tap". The trip is taken to full height, then `endClearsFooter('[data-testid="card"]')` checks that its last row clears the footer.
- **`endClearsFooter`** (`phone-test.mjs:2807`) sets the viewport to a small phone (375×667), then waits on `cardsSettled`. That calls `mapIdle`, which waits up to 10 s for every GeoJSON source to be loaded and the camera still.
- **What doesn't settle** is `warm-programs`, the source of the hidden twins that compile the lit layers' GL programs while the map is idle (`src/features/routes/map/warm-programs.ts`). After the resize, `isSourceLoaded('warm-programs')` stays false for the whole 10 s.

## What is not known yet

- Why it happens only in a whole run. A whole run holds every part's sections in one page, one after another. Part 1 alone holds the same section and passes. So something an earlier section (from part 2 or 3) leaves behind probably keeps `warm-programs` from loading after the resize. Possible candidates: the made-up map (5d), or a basemap switch.
- Whether it's the harness or the page. The page's own behaviour after a resize may be fine: `warm-programs` draws twins only once, and may never be reloaded once its job is done. If so, `mapIdle` would be waiting on a source nobody needs, and the fix is in the harness: leave `warm-programs` out of the sources it waits on, as it already does for the flowing ones.

## To reproduce

```sh
npx vite --port 5291 --strictPort &
PARA_BASE=http://localhost:5291 node tests/e2e/phone-test.mjs 2>&1 | tail -8
```

## Next step

1. Print `m.getSource('warm-programs')` and its tiles' state when `mapIdle` gives up.
2. Run part 1 with each other part's sections added in turn before it, to find the section that leaves it unloaded.
3. Then either fix what that section leaves behind, or have `mapIdle` skip `warm-programs`, with the reason in a comment.

Not a test to skip or loosen: until then, run phone-test in its three parts, as CI does.

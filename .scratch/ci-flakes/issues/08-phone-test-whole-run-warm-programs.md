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

## Found, 2026-11-27: the made-up map left on the page

A whole run on `staging` fc39ddad didn't stop at `endClearsFooter`. Instead it failed 3 checks in part 3's last section, "4e. the height kept, card to card" (104 passed, 3 failed, 3 skipped):

- `the first card open, the list a tap opens stands at its height`: first card 280 px; list null px
- `a tap reaches the map at (92, 416)`: overview is over it there
- `the first card at Low, the list opens at Low`: first card null; list null

It also skipped, unexpectedly: `a trip a line of one route opens opens at the middle`.

**Cause:** 5d (part 2) serves the made-up map on the page with `serveTwoWayMap(page)` and never removes it. The place search after it relies on that on purpose. 4e comes next in the file and reloads that same page, so it gets the made-up map's one route: a tap where "the most routes pass" opens a trip, not the route list.

**Shown:** `PHONE_PART=3/3` alone passed (64/0/1). With `serveTwoWayMap(page)` added before 4e, it failed the same 3 checks.

**Fix:** a whole run gives 4e a phone of its own (`newPhone({ isTouchOnly: false })`, `tests/e2e/phone-test.mjs`). It's not touched by finger alone, because part 3 alone reaches 4e on 4f's phone and 4e presses keys. A touch phone stops at its `page.keyboard`.

After the fix, 2026-11-27, Linux, every outside request stood in:

| Run | Passed | Failed | Skipped |
| --- | --- | --- | --- |
| Whole | 112 | 0 | 2 |
| `1/3` | 49 | 0 | 1 |
| `2/3` | 27 | 0 | 0 |
| `3/3` | 64 | 0 | 1 |

**`warm-programs` not seen:** 3 whole runs since (2 on fc39ddad, 1 on the fix) never stopped at `endClearsFooter` with "source warm-programs loading". The stop above is not reproduced. It stays open, and it may be gone. The next whole run that stops on it should record the commit and the source's state, as in Next step 1.


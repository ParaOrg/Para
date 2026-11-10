# 01: One-ride options: finding and ranking

Status: resolved (logic only; the reach as question 1 recommends, until the owner answers)
Type: task

## What to build

Pure functions in `routes/model/`, no React and no map:

- **`oneRideOptions(start, place, index, reach)`.** Every direction with a hintuan within `reach` of the start and, later along it (by `stop_sequence`; a loop counts round from its tip), a hintuan within `reach` of the place.
  - One option per direction: its pair with the least total walk.
  - Each option: the direction, the boarding hintuan, the stop, both walks (straight-line metres), and the ride's length along the overview line.
- **The ranking.** Total walk, then the ride's length, then the direction's name.
- **The widening.** Nothing within 600 m: again at 1 km, marked as widened (question 1).
- **The fare over a ride** moves to 02: it needs each row's full line and the trip card's own fare rules (`pickedFareFor`), read for the rows on show.

## Acceptance checks

- Unit checks on a made-up index:
  - boarding before getting off, never after;
  - a loop round its tip;
  - two hintuans of one direction near the start (the better pair wins);
  - ties broken by ride length then name;
  - nothing within reach;
  - the widening.
- A check on the published index: options from a few real places, timed; the target is under 20 ms on a laptop for today's 53 directions, to be measured.
- `npm run check`; CI green; merged into staging.

## Answer

Built:
- **The rules:** `routes/model/one-ride-options.ts` (`bestRide`, `oneRideOptions`, `byLeastWalking`, `WALK_REACH_M` 600, `WIDER_REACH_M` 1000).
- **The input:** `routes/model/direction-stops.ts` (`directionStopsOf`) builds each direction's line and its hotspots in passing order (`orderLinked`) once a page from the published index.

**Checks.** `tests/unit/one-ride-options-test.mjs`:
- boarding before the stop;
- a loop round its tip;
- a direction's best pair;
- the ranking's three keys;
- the widening;
- on the published index, a median of 5.4 ms per place over its 34 directions with linked stops (the bound is 50 ms, so a slow runner passes).

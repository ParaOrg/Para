# 06: The get-off countdown

Status: resolved (logic only; the reminder that says it, 07, waits for the owner's design)
Type: task
Blocked by: 01

## What to build

- **What it does.** A pure function in `routes/model/`: given the trip's direction, the stop, and the commuter's position, how many hintuans are left before the stop, or how far, when the line has none between.
- **Behind the fix.** It uses the position's projection onto the line, so a fix beside the road counts as on it. It never counts back up when the fix wobbles.
- **The rule for saying it.** A one-line rule for when the reminder speaks: two hintuans to go, then the next one, then here.

## Acceptance checks

Unit checks on a made-up line: counting down by hintuans and by distance, a wobbling fix, a fix past the stop, a loop.

## Answer

Built: `routes/model/get-off-countdown.ts`.
- **`countdownTo(ride, stop, at, previous)`** returns one of:
  - hintuans left, while any lie between;
  - metres left, when none do;
  - here (within 60 m);
  - passed (more than 150 m past the stop, or past the line's end).

  It reads the fix along the line, never climbs above `previous`, and comes round the tip on a loop.
- **`cueOf`** decides when the reminder speaks: two hintuans to go, the last 400 m with none between ("Bababa ka na sa susunod"), and at the stop.

Unit checks: `tests/unit/get-off-countdown-test.mjs`.

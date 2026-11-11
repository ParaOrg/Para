# 01: One-ride options: finding and ranking

Status: ready-for-agent (logic only; the owner's answers to questions 1, 3 and 5 in `../README.md`)
Type: task

## What to build

Pure functions in `routes/model/`, no React and no map:

- **`oneRideOptions(start, place, index, reach)`.** Every direction with a hintuan within `reach` of the start and, later along it (by `stop_sequence`; a loop counts round from its tip), a hintuan within `reach` of the place.
  - One option per direction: its pair with the least total walk.
  - Each option: the direction, the boarding hintuan, the stop, both walks (straight-line metres), and the ride's length along the overview line.
- **The ranking.** Total walk, then the ride's length, then the direction's name.
- **The widening.** Nothing within 600 m: again at 1 km, marked as widened (question 1).
- **The fare over a ride.** The direction's fare rule over the ride's length, from the full line once it is read (question 5). Reuses the trip card's fare rules (`pickedFareFor`), not a copy.

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

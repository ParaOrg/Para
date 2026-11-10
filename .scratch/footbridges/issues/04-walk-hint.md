# 04: A footbridge hint on the walk (design 1)

Status: needs-triage (after 01; the owner's answer to question 5)
Type: task
Blocked by: 01

## What to build

- **When.** The walk from a ride's end to where the commuter is going (ticket 07's landmark: "About 300 m to SM North EDSA, in a straight line") crosses a major road (trunk, primary or secondary) in a straight line.
- **What the card adds.** The nearest footbridge over that road within about 300 m of where the straight line crosses it: "Cross Commonwealth Ave by the footbridge 120 m north (elevator)".
- **None mapped.** "Crosses Commonwealth Ave: no footbridge mapped nearby".
- **The rules as pure functions** in `routes/model/`: does a segment cross a road, which road, the nearest footbridge over it and on which side.
- **The major roads.** Their lines come with the footbridge file or a sibling, simplified and kept near hintuans. Measure the size first: it must stay out of the opening code and under the file's ceiling.

## Not in this ticket

A path to the footbridge, turn-by-turn words, or a walk drawn on the map (design 2, ticket 05).

## Acceptance checks

- Unit checks on made-up roads and footbridges:
  - a walk that crosses, and one that doesn't;
  - a footbridge on either side;
  - none within reach;
  - two roads crossed (name both, nearest first).
- A story of the trip card with each hint.
- A phone-test check on the made-up map with a made-up footbridge.
- A ds-reviewer PASS; `npm run check`; CI green; merged into staging.

# 02: The options list

Status: waits for the owner's design (`../README.md`, "Owner designs first" 1 and 2)
Type: task
Blocked by: 01, and the owner's Figma

## What to build, once designed

- **"Go here" on any searched place.** Lists 01's options from the commuter's position: route, signboard, walk to board, walk from your stop, fare.
- **The rows on show** fetch their full lines, then show their fares.
- **"More ways"** past the first five (question 3).
- **The other states:** the empty state, the loading state, and location off (question 2).
- **A row picked** opens its trip with the start and end picked, as place search's ticket 07 opens a trip with its end picked (`useCardCamera`'s `openTripFromPlace`, `useRideTo.pickOn`).

## Acceptance checks

Stories for every state; a phone-test check on the made-up map; shared code unchanged against staging; a ds-reviewer PASS; CI green.

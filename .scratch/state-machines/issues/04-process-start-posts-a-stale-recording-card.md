# 04: A process start shows a stale Recording card for a moment

Status: resolved
Type: task
Blocked by: 02

Impact: low; heals in a second or two.

## Evidence

`RidePlugin.load` posts the card from RideState. After a kill with no restart (state X1), RideState still says `recording`, so opening Para shows **Recording** until the page opens `unfinished` and tells `none`.

## What to build

Post a recording card only when the service runs (invariant 1); otherwise post nothing until the page has told the card. Comes for free with the Ride module (step 2).

## Acceptance checks

- Unit on the card decision: RideState `recording` with no service gives no card.

## Comments

Resolved by #857: a recording card is posted only while the service runs (RideCard), and RidePlugin.load marks a ride with no service cut off.

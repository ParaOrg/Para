# 06: The get-off countdown

Status: logic ready-for-agent after 01
Type: task
Blocked by: 01

## What to build

- **What it does.** A pure function in `routes/model/`: given the trip's direction, the stop, and the commuter's position, how many hintuans are left before the stop, or how far, when the line has none between.
- **Behind the fix.** It uses the position's projection onto the line, so a fix beside the road counts as on it. It never counts back up when the fix wobbles.
- **The rule for saying it.** A one-line rule for when the reminder speaks: two hintuans to go, then the next one, then here.

## Acceptance checks

Unit checks on a made-up line: counting down by hintuans and by distance, a wobbling fix, a fix past the stop, a loop.

# 03: Other routes for this ride

Status: logic built; the wiring waits for 02 (a trip opened from Go here), with the route card session
Type: task
Blocked by: 01

## What to build

- **Where.** On a trip opened from Go here, the trip detail's "Other routes" (Q146, the route card session's) lists this ride's other options, best first.
- **What a pick does.** It opens that option's trip with its picks.
- **Elsewhere.** On any other trip, "Other routes" is as it is today.
- **Not a fork.** One component: the list's contents change, not its look. If the look must change, it goes to the owner first ("Owner designs first" 6).

## Acceptance checks

A story of the trip detail with a ride's options; a phone-test check; CI green; merged into staging after the route card session has seen it.

## Answer (so far)

**Built:** `routes/model/other-routes-for-ride.ts`, pure logic on top of `otherRoutesFrom`.
- `otherRoutesForTrip(all, of, options)`: with a ride's options (the trip came from Go here), the other options' directions in their rank, never the trip's own. With none, `otherRoutesFrom(all, of)` as today.
- `rideOptionFor(options, direction)`: the option a picked row stands for, so its trip opens with its own boarding hintuan and stop.
- Unit checks: `tests/unit/other-routes-for-ride-test.mjs`.

**Not changed:** `TripOtherRoutes` and the trip detail (the route card session's). The wiring is one line in `TripCard` (`otherRoutesForTrip` in place of `otherRoutesFrom`, given the options) plus a pick that passes `rideOptionFor`'s picks. It lands with 02, since no trip opens from Go here before the list exists, and goes to the route card session first.

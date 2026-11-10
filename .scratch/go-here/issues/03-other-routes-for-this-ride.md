# 03: Other routes for this ride

Status: ready-for-agent after 01 (coordinate with the route card session first)
Type: task
Blocked by: 01

## What to build

- **Where.** On a trip opened from Go here, the trip detail's "Other routes" (Q146, the route card session's) lists this ride's other options, best first.
- **What a pick does.** It opens that option's trip with its picks.
- **Elsewhere.** On any other trip, "Other routes" is as it is today.
- **Not a fork.** One component: the list's contents change, not its look. If the look must change, it goes to the owner first ("Owner designs first" 6).

## Acceptance checks

A story of the trip detail with a ride's options; a phone-test check; CI green; merged into staging after the route card session has seen it.

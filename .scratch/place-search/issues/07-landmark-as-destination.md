# 07: "Set as destination" for a landmark

Status: ready-for-agent (claimed by the place-search builder; starts after 06, once release 0.4.0 is in main)
Type: task
Blocked by: 06, and release 0.4.0 merged into main (the hub says when)

Approved to build (the owner, 2026-11-07, every question as recommended), after ticket 06.

## What it would do

From a landmark's routes-near-here panel, "Set as destination" makes the landmark the trip's end, so a commuter can search "SM North EDSA" and get a ride that ends near it.

## How it fits today's code

A trip's S and E are hintuans on the open direction's own line (`routes/map/use-ride-to.ts`: `setStart`, the end pick, `rideToEnd`). A landmark is not on any line, so the plan has three steps:

1. **Which trip.** The routes near the landmark (`routesNearHere`) are the candidates: every direction stopping at a hintuan within 500 m. Open the route list with them, as a tap on several routes does, each route's row saying how far its nearest hintuan is from the landmark.
2. **Which E.** On the trip a commuter opens, the end pick is that direction's hintuan nearest the landmark, picked as a tap on its row picks it. The pin from 06 stays on the landmark.
3. **The last stretch.** The card says how far E is from the landmark, straight-line, as the panel does today.

No new data and no database change: everything is in the published index and the landmark file.

## Questions for the owner (each with a recommendation)

1. **Where is the button?** Recommended: on each hintuan row of the routes-near-here panel ("Go here"), not one button for the whole landmark, since each hintuan is a different set of routes.
2. **Several routes stop near it: which opens?** Recommended: the route list of every direction stopping there, nearest hintuan first, the commuter picking one, as with any tap on several routes. No automatic choice.
3. **The start.** Recommended: unchanged. The commuter sets S as today; with location on, the nearest hintuan of that direction is offered as today's loop tip does, nothing more.
4. **The walk from E to the landmark.** Recommended: a line of text on the trip card ("about 300 m to SM North EDSA, in a straight line"), and no line drawn on the map until the owner designs one.
5. **Changing trains or jeeps (two rides).** Recommended: out of scope. One direction, one ride, as the app plans today.
6. **Kept between visits?** Recommended: no. Like every pick today, it is gone on a reload.

## Acceptance checks (once approved)

- Unit checks for choosing E (the direction's hintuan nearest the landmark) and the candidates' order.
- Stories and a phone-test check; shared code unchanged; a ds-reviewer PASS; CI green.

## Answers (the owner, 2026-11-07, via the hub: all as recommended)

1. "Go here" on each hintuan row of the routes-near-here panel.
2. The route list of every direction stopping there, nearest hintuan first; the commuter picks one.
3. The start is unchanged.
4. The walk to the landmark: one line of text on the trip card, no line on the map.
5. Changing rides is out of scope.
6. Not kept on a reload.

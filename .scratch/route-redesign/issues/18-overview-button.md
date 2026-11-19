# 18: An Overview button, and a still camera

Status: ready-for-agent
Type: task
Blocked by: 05

Comes after the RouteCard restyle (05) and before the shell (12). The owner's request, confirmed through the hub on 2026-11-19.

## What to build

**The camera stays still:**

1. **Opening a trip** fits its whole route once, as today.
2. **Dragging or resizing the bottom sheet** never moves the camera after that. The re-fit on a sheet height change goes.
3. **Tapping a route card in the list** (a place with several routes) neither zooms nor fits.

**An "Overview" button** brings the fit back:

- **What it is:** the design system's secondary button, labelled "Overview".
- **When it shows:**
  - in a trip, once the camera has moved away from the route's overview;
  - in the list, while a route card is selected, since selecting it did not move the camera.
- **What a tap does:** it fits the trip's whole route, or the selected card's routes, with today's fit and padding. The button hides once that fit settles.
- **What counts as "moved away":** any camera move since the last overview fit. That includes the commuter's own (events with an `originalEvent`) and the app's (a hintuan's glide, locate-me). It is not judged by comparing bounds. The pull request says which signal it uses.
- **Where it sits:**
  - On a phone, it floats just above the sheet's top edge, at locate-me's height but on the left, and moves with the sheet as locate-me does.
  - On a desktop, it sits in locate-me's row, on the left of the map area, just right of the docked panel. That placement is the hub's call; the pull request says so.
- **Accessibility:**
  - It is a real button, reachable by keyboard, with the accessible name "Overview".
  - When it hides, focus moves somewhere sensible, never lost.
  - Reduced motion is respected, as today's fits do.

## Done when

- **The changed checks.** The e2e checks that expected a re-fit on a sheet drag, or a zoom on a card tap, are updated. The pull request names each one as a behaviour change. Nothing else is loosened.
- **New checks**, one for each of these:
  - no camera move on a sheet drag;
  - none on a card tap;
  - the button appears after a pan;
  - a tap on it fits;
  - it hides afterwards.
- **The pull request** carries the branch's preview link and asks the hub before it merges.

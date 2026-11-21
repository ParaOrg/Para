# 15: The nearby list

Status: needs-design
Type: task
Blocked by: 05, 12

## What to build

- **The route card list always shows**, for places near the commuter, nearest first (README, decision 9).
- **The radius:**
  - It starts within 1 km.
  - With fewer than about 5 cards, it widens step by step up to 3 km.
  - It is never empty: past 3 km, it shows the nearest few.
- **Where it looks from:**
  - the commuter's place, after they tap "locate me";
  - a place or route they tap on the map;
  - the map's centre, when there is no location.
  - All of these work on phone and desktop. The list does not refresh on its own while the commuter moves.
- **With a trip open,** the trip replaces the list, as today. Closing it brings the list back.
- **No distance label** on the cards for now. The owner will design it later.

## Before building

- Ask the owner, through the hub, for any design the list itself needs (an empty-state line past 3 km, a heading). This issue builds no look the owner has not drawn.

## Done when

- Unit tests cover the radius widening and the never-empty rule, with made-up places.
- The suites cover "locate me", a tap on the map, and no location, with the list's cards in distance order.

# Choosing a ride's start and end

**The owner's design (2026-10-15):** TimelineRouteDetail, Figma 4137:9886, the timeline inside TimelineRouteDetailCard (3778:3183). The example is MRT-3, North Avenue → Taft Avenue. In code, TimelineRouteDetail is `TripTimeline` (`src/features/routes/cards/trip-timeline.tsx`); `small-fixes` 3 gives it the Figma name.

## Today

- A ride always starts where the direction leaves.
- Tapping a hintuan (on a train, a station) cuts the ride there. It becomes the end (E), its pill shows the pesos (on a train, the station's code), and the Distance and fare tiles read from the start to there. This is `useRideTo` (`src/features/routes/map/ride-to.ts`) and `rideCut` (`src/features/routes/model/ride.ts`).
- The glossary (Ride): "A ride may be cut short at a hintuan: the ride to there, priced from where the direction leaves."

## The design, state by state

| State (Figma) | What it shows |
| --- | --- |
| Variant6 (4157:7737) | Folded: S North Avenue, "7 more stops", E Taft Avenue |
| Rest (4137:9884) | Open, nothing picked |
| Choosing (4137:9887) | Shaw Boulevard tapped: it becomes the end (E), with its code pill (YL06). Under the row: **Set as start** |
| Variant3 (4148:12161) | After Set as start: Shaw Boulevard is the start (S), and North Avenue loses its S. Under the row: **× Remove as start** |
| Variant4 (4151:13124) | Start at Shaw Boulevard, then Ayala tapped: Ayala is the end (E), with the fare pill. The ride is Shaw Boulevard → Ayala |
| Variant5 (4151:13619) | Start at Shaw Boulevard, then Quezon Avenue tapped, a station **before** the start: E Quezon Avenue, with the fare pill |

## The rail: TimelineStick (Figma 3716:1759)

The owner's TimelineStick set gained pieces for a ride that doesn't run end to end (2026-10-15). In code the rail is `STICK` in `trip-timeline.tsx`, which today draws only the connected pieces.

| Piece | Rail above the dot | Rail below the dot | For |
| --- | --- | --- | --- |
| Top / Middle / Bottom / Disclosure, Connected | as today | as today | A row inside the ride |
| **MiddleTop**, Connected | none | yes | The row the ride starts at, mid-list |
| **MiddleBottom**, Connected | yes | none | The row the ride ends at, mid-list |
| Any piece, **Disconnected** | none | none | A row on its own, with no rail |

**Still being drawn:** the states use the pieces in different ways. In Choosing (North Avenue → Shaw Boulevard), the rail breaks after Shaw Boulevard and starts again at Boni, so the rows after the end keep a rail of their own. In Variant4 (Shaw Boulevard → Ayala), Taft Avenue has no rail, and in Variant3 Shaw Boulevard sits alone between two rails. Which rule to follow is open (below).

## How it works, as read from the design

- **Tap a row:** it becomes the end, and the ride runs from the start to there, as today.
- **Set as start:** that row becomes the start instead. Until another row is tapped, the ride runs from it to where the direction goes. Variant3 marks no row E; read as Taft Avenue keeping its E, as today.
- **Remove as start:** the start goes back to where the direction leaves.
- **With a start picked,** tapping a row after it sets the end (Variant4).
- **The tiles:** Distance and fare read from the start to the end.
- **The map:** the stretch from start to end is drawn as the ride; before the start and after the end are pale, as after a picked end today. The S and E markers on the map move with the picks.
- **Fares need no new data.** Jeeps price by the metres between the two picks (`fareFor` in `src/features/routes/model/fares.ts`). Trains price by the station pair: `railFare` (`src/features/routes/model/rail-fares.ts`) already takes any two stations, from LRMC's and LRTA's full matrices and MRT-3's count of stations.
- **Jeeps and trains alike:** the design's example is a train, and it is read as the same for jeep hintuans.
- **The studio** gets it too, since it shares the card.
- **An end before the start (Variant5)** switches the card to the other direction (the owner's call, 2026-10-15). Shaw Boulevard → Quezon Avenue runs the other way, so the card turns to that direction with both picks kept. It finds them there with `small-fixes` 2's rule: the same box, else the nearest box of the same place. On MRT-3 that's Southbound to Northbound (`small-fixes` 4).

## Decided (the owner, 2026-10-15)

- **No View button.** The owner took it out of the design; the row's only button is Set as start (or × Remove as start).
- **"Set as start", not "Make as start".** Changed in Figma the same day: the button in the Timeline component's Selected variant (which the Choosing state shows), the RouteTripDetail mockup's button, and four draft frames on the RouteTripDetail page.
- **The pill stays as today**, on the end: on a train, the station's code then the pesos (`YL06 · ₱13`); on a jeep, the pesos. The design's "Calculated Fare" stands for those pesos.
- **The fold says "stations" on trains:** "N more stations". Jeeps keep "N more hintuans". Today it says hintuans for both (`trip-timeline.tsx`); the glossary avoids "stop". Changed in Figma the same day: the fold row in the Timeline component's Rest, Pressed and Selected variants, which every TimelineRouteDetail state and card example inherits.
- **SWITCH with picks:** the picked places stay put. A lone pick keeps its role (as in `small-fixes` 2: Antipolo → Betty Go becomes Recto → Betty Go). With both picked, they trade roles: Shaw Boulevard → Ayala becomes Ayala → Shaw Boulevard.
- **The fold once a start or end is picked:** the rows outside the ride fold, and the ride's own rows stay open.

## Still open

1. **The rail outside the ride.** Either (a) the rail breaks at the start and the end, and the rows outside the ride keep a rail of their own (Choosing), or (b) the rail runs only along the ride, and the rows outside show their dots with no rail (Variant4's Taft Avenue). Proposal: (b). Read at a glance, the one rail is the ride, matching the map, where everything outside the ride is pale.
2. **Variant5 in the app.** An end before the start now switches the card to the other direction (decided above). So the app shows that ride in its own direction's order (Northbound, Shaw Boulevard → Quezon Avenue, top to bottom), and Variant5's layout, with the end above the start, never appears.

## Words (for `CONTEXT.md`)

- **Ride:** "A ride may be cut short at a hintuan …" becomes: a ride may start and end at any hintuan it passes, in its travel order. It's the ride from there to there, priced between them.
- **Trip:** "A hintuan picked on the trip prices the ride to there" becomes: a start and an end picked on the trip price the ride between them.

## Depends on

- **`small-fixes` 2** (SWITCH keeps the picked hintuan): its rule finds a pick on the other direction.
- **`small-fixes` 3** (the renames): built after it, so the work lands in the renamed files.

## Done when

- Unit tests: a ride between two picks (metres, a jeep's fare and a train's), an end before the start switching direction, and SWITCH trading roles.
- A story for each Figma state.
- A headless check on the public map: pick a start and an end, and the Distance and fare tiles and the map's S and E agree.

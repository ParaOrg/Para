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

**The rule (the owner, 2026-10-15): the rail runs only along the ride.** The rows outside it show their dots with no rail (Disconnected); the start is MiddleTop (or Top at the origin) and the end MiddleBottom (or Bottom at the destination). Read at a glance, the one rail is the ride, matching the map, where everything outside the ride is pale. Some of the Figma states still draw the earlier way, where the rail breaks at the ride's ends but the rows outside keep a rail of their own (Choosing, Variant3, Variant4); the code follows the rule.

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
- **A row before the start (Variant5): the card stays as it is** (the owner, 2026-10-15). Variant5 is the design, exactly as drawn: on the Southbound card, E Quezon Avenue sits above S Shaw Boulevard. The card never flips on a tap, and no switch button is ever added under the row (a first try in Figma was taken out at the owner's word).
  - **The map serves the ride by itself,** so the rider keeps their place: it draws Shaw Boulevard → Quezon Avenue along the other direction's line (here Northbound), its arrows pointing the way the ride goes, with S and E where the picks are.
  - **The tiles** read that ride: a train's fare by the station pair (`railFare`), a jeep's by the metres along the other direction's line between the two places.
  - **On a jeep**, the other direction may run other roads: the two picks are found on it with `small-fixes` 2's rule (the same box, else the nearest box of the same place). If it passes no box of one of the places, there's no ride to price: the row is picked, with no pill.
  - **The rail** is the ride's stretch on the card, from the E row down to the S row (MiddleTop at Quezon Avenue, MiddleBottom at Shaw Boulevard, as Variant5 draws it).
  - **The card only turns when the rider taps Northbound or Southbound** (Papunta or Pabalik on a jeep).

## Decided (the owner, 2026-10-15)

- **No View button.** The owner took it out of the design; the row's only button is Set as start (or × Remove as start).
- **"Set as start", not "Make as start".** Changed in Figma the same day: the button in the Timeline component's Selected variant (which the Choosing state shows), the RouteTripDetail mockup's button, and four draft frames on the RouteTripDetail page.
- **The pill is the owner's RouteTripLineDetailPill** (Figma 4161:8299, 2026-10-15), on the end:
  - **Two**, on a train: the station's code and the pesos as two white halves side by side, 1 px apart (`spacing/px`), so the card's colour shows between them as the divider. The code's half is rounded on the left, the pesos' on the right.
  - **One**, on a jeep: the pesos alone, rounded both ends.
  - Each half: `Content/inverse` fill, padding 2 × 6 (`spacing/0-5`, `spacing/1-5`), text `text-sm/medium` (SN Pro Medium 14/20) in the livery's surface colour (`Card/red/surface` in the red livery).
  - Today's pill is one piece with a dot between, `YL06 · ₱13` (`trip-timeline.tsx`). The halves replace the dot; a screen reader still hears "YL06 ₱13" as two words.
  - The design writes `₱13-24` with a hyphen; the code keeps its en dash, `₱13–24` (`pesoRange`).
- **Set as start is the Button primitive, Primary, Small** (Figma: Button, Variants=Primary, Size=Small, in the Timeline component's TimelineDisconnected / Selected variant, 4122:8540). The code's Button allows Small only on Special and Secondary, "until the owner designs it" (`src/design-system/primitives/button.tsx`). It's designed now, so Primary gains Small, with a story.
- **The fold says "stations" on trains:** "N more stations". Jeeps keep "N more hintuans". Today it says hintuans for both (`trip-timeline.tsx`); the glossary avoids "stop". Changed in Figma the same day: the fold row in the Timeline component's Rest, Pressed and Selected variants, which every TimelineRouteDetail state and card example inherits.
- **The fold once a start or end is picked:** the rows outside the ride fold, and the ride's own rows stay open.

## Still open

1. **What Northbound / Southbound does to the picks.** The owner (2026-10-15): "only when they use north bound south bound it will reset". That clashes with `small-fixes` 2, the owner's earlier ask that Papunta / Pabalik keep the picked hintuan (Antipolo → Betty Go becomes Recto → Betty Go). Read as: **on a train, Northbound / Southbound clears the picks; on a jeep, Papunta / Pabalik keeps them** (`small-fixes` 2). To confirm. (Before this, both picks were to stay and trade roles on SWITCH.)

## Words (for `CONTEXT.md`)

- **Ride:** "A ride may be cut short at a hintuan …" becomes: a ride may start and end at any hintuan it passes. It's the ride from there to there, priced between them; an end before the start is ridden the other way, on the other direction's line.
- **Trip:** "A hintuan picked on the trip prices the ride to there" becomes: a start and an end picked on the trip price the ride between them.

## Depends on

- **`small-fixes` 2** (SWITCH keeps the picked hintuan): its rule finds a pick on the other direction.
- **`small-fixes` 3** (the renames): built after it, so the work lands in the renamed files.

## Done when

- Unit tests: a ride between two picks (metres, a jeep's fare and a train's); an end before the start ridden on the other direction's line with the card unturned; a jeep whose other direction misses one of the places; and what Northbound / Southbound and Papunta / Pabalik do to the picks.
- A story for each Figma state.
- A headless check on the public map: pick a start and an end, and the Distance and fare tiles and the map's S and E agree.

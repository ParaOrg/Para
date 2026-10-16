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
| Variant5 (4151:13619) | Start at Shaw Boulevard, then Quezon Avenue tapped, a station **before** the start: E Quezon Avenue, with the fare pill, above the S. The rail breaks just above the E and just below the S, and runs on along the stations outside the ride |

## The rail: TimelineStick (Figma 3716:1759)

The owner's TimelineStick set gained pieces for a ride that doesn't run end to end (2026-10-15). In code the rail is `STICK` in `trip-timeline.tsx`, which today draws only the connected pieces.

| Piece | Rail above the dot | Rail below the dot | For |
| --- | --- | --- | --- |
| Top / Middle / Bottom / Disclosure, Connected | as today | as today | A row inside the ride |
| **MiddleTop**, Connected | none | yes | The row the ride starts at, mid-list |
| **MiddleBottom**, Connected | yes | none | The row the ride ends at, mid-list |
| Any piece, **Disconnected** | none | none | A row on its own, with no rail: a start alone |

**The rule (the owner, 2026-10-16): the rail breaks where the ride starts and where it ends, and runs on along the rows outside it**, as the Figma states draw it (Choosing, Variant3, Variant4, Variant5): "can you still connect those dots, since it might see the users as broken it doesnt flow to the eyes". The row just above a break is MiddleBottom (the origin, Top, Disconnected), the row just below it MiddleTop (the destination, Bottom, Disconnected); a fold's row runs the rail of the rows it folds. From 2026-10-15 to then, the rail ran only along the ride and the rows outside were their dots alone.

## How it works, as read from the design

- **Tap a row:** it becomes the end, and the ride runs from the start to there, as today.
- **Set as start:** that row becomes the start instead. Until another row is tapped, the ride runs from it to where the direction goes. Variant3 marks no row E; read as Taft Avenue keeping its E, as today.
- **Remove as start:** the start goes back to where the direction leaves.
- **An end row tapped with a start keeps the start** (the owner, 2026-10-16: "keep the start"; until then it let the start go): that end is the ride's end. The destination: the ride from the S on to it, its E there. The origin: the ride back from the S to it, as an end above the start, its E there and the arrows from S to E. With no start, an end row is the whole ride, as before. A jeep's SWITCH swaps a start and the destination as it swaps a start and an end. A start ridden back to the origin rode the way back's own way, so it stays the start and the way back's destination is its end (Claude's call, 2026-10-16, the owner's to confirm: a swap would start the way back at its own destination, which no start can).
- **Letting a pick go folds back** (the owner, 2026-10-16: "fold back"): the folds return to how they were before the pick; the rows it folds back stay drawn, closing in view, and a row folded away under the keyboard's focus hands it to its fold. From 2026-10-15 a let-go opened the whole list.
- **The ferry** keeps its picks over SWITCH and swaps them, as a jeep does (the owner, 2026-10-16: "ferry ok").
- **With a start picked,** tapping a row after it sets the end (Variant4).
- **The tiles:** Distance and fare read from the start to the end.
- **The map:** the stretch from start to end is drawn as the ride; the line on either side of it is pale, as after a picked end today. The S and E markers on the map move with the picks.
- **Fares need no new data.** Jeeps price by the metres between the two picks (`fareFor` in `src/features/routes/model/fares.ts`). Trains price by the station pair: `railFare` (`src/features/routes/model/rail-fares.ts`) already takes any two stations, from LRMC's and LRTA's full matrices and MRT-3's count of stations.
- **Jeeps and trains alike:** the design's example is a train, and it is read as the same for jeep hintuans.
- **The studio** gets it too, since it shares the card.
- **A row before the start stays the end, above the S, and the arrows turn** (the owner, 2026-10-16, his Variant5's card): "Can you reverse the arrow, dont' switch please, it's confusing for users, remain what we have before what I want you to do is thee arrow in route line change the flow to accompany or in accordance with start and endpoint seletected". On the Northbound card with Ortigas the start, Buendia tapped: E Buendia above S Ortigas, the ride Ortigas → Buendia on this card's own line, the rest pale, and the chevrons along the whole line flowing from the S to the E. Priced between the two, as any ride.
  - **History:** on 2026-10-15 that ride ran on the other direction's line, its chevrons its own and this line all pale; that morning of 2026-10-16 a row tapped above the start became the start and the start the end (the swap). Both are gone.
  - **Any end already picked** is replaced, as any tap picks the ride's other end.
  - **A jeep's SWITCH** swaps a start and an end as before; landed out of order on the way back, the ride runs back along it too.
  - **The card only turns when the rider taps Northbound or Southbound** (Papunta or Pabalik on a jeep), and no switch button is ever added under the row.

## Decided (the owner, 2026-10-15)

- **No View button.** The owner took it out of the design; the row's only button is Set as start (or × Remove as start).
- **"Set as start", not "Make as start".** Changed in Figma the same day: the button in the Timeline component's Selected variant (which the Choosing state shows), the RouteTripDetail mockup's button, and four draft frames on the RouteTripDetail page.
- **The pill is the owner's RouteTripLineDetailPill** (Figma 4161:8299, 2026-10-15), on the end:
  - **Two**, on a train: the station's code and the pesos as two white halves side by side, 1 px apart (`spacing/px`), so the card's colour shows between them as the divider. The code's half is rounded on the left, the pesos' on the right.
  - **One**, on a jeep: the pesos alone, rounded both ends.
  - Each half: `Content/inverse` fill, padding 2 × 6 (`spacing/0-5`, `spacing/1-5`), text `text-sm/medium` (SN Pro Medium 14/20) in the livery's surface colour (`Card/red/surface` in the red livery).
  - Today's pill is one piece with a dot between, `YL06 · ₱13` (`trip-timeline.tsx`). The halves replace the dot; a screen reader still hears "YL06 ₱13" as two words.
  - The design writes `₱13-24` with a hyphen; the code keeps its en dash, `₱13–24` (`pesoRange`).
  - **The start's pill is its station's code alone, the end's its code and the ride's pesos** (the owner, 2026-10-16: "Pill on start is only the codesign of that station, no price / the end should have both price and codesign"; that morning both carried the pesos, as Variant4 draws them). A jeep's start, with no code to say, has no pill. An end of the trip picked as the ride's end, with a start, carries the end's pill too.
- **Set as start is the Button primitive, Primary, Small** (Figma: Button, Variants=Primary, Size=Small, in the Timeline component's TimelineDisconnected / Selected variant, 4122:8540). The code's Button allows Small only on Special and Secondary, "until the owner designs it" (`src/design-system/primitives/button.tsx`). It's designed now, so Primary gains Small, with a story.
- **The fold says "stations" on trains:** "N more stations". Jeeps keep "N more hintuans". Today it says hintuans for both (`trip-timeline.tsx`); the glossary avoids "stop". Changed in Figma the same day: the fold row in the Timeline component's Rest, Pressed and Selected variants, which every TimelineRouteDetail state and card example inherits.
- **The fold once a start or end is picked:** the rows outside the ride fold, and the ride's own rows stay open.

- **SWITCH and the picks: trains reset, jeeps keep.** On a train, Northbound / Southbound clears the start and the end, and the turned card shows its whole ride. On a jeep, Papunta / Pabalik keeps them, found on the other direction with `small-fixes` 2's rule.

Nothing is left open.

## Words (for `CONTEXT.md`)

- **Ride:** "A ride may be cut short at a hintuan …" becomes: a ride may start and end at any hintuan it passes. It's the ride from there to there, priced between them, on its direction's own line; an end before the start is ridden back along it, the arrows turned.
- **Trip:** "A hintuan picked on the trip prices the ride to there" becomes: a start and an end picked on the trip price the ride between them.

## Depends on

- **`small-fixes` 2** (SWITCH keeps the picked hintuan): its rule finds a pick on the other direction.
- **`small-fixes` 3** (the renames): built after it, so the work lands in the renamed files.

## Done when

- Unit tests: a ride between two picks (metres, a jeep's fare and a train's); an end before the start ridden back, the S and E where they were picked and the chevrons from S to E (2026-10-16); a jeep's SWITCH by other streets landing out of order; the rail broken at the ride's ends and running on outside it; and what Northbound / Southbound and Papunta / Pabalik do to the picks.
- A story for each Figma state.
- A headless check on the public map: pick a start and an end, and the Distance and fare tiles and the map's S and E agree.

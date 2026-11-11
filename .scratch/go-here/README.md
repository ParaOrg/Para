# Go here

Status: building the logic. The owner approved "Go here" (Q113 to Q117 and Q119, 2026-11-10) and answered its questions as recommended (Q171 to Q178, 2026-11-11, below). Logic and data are built ahead; every screen waits for the owner's design.

A commuter searches a place and asks Para how to get there on one ride, then rides it with Para's help. It grows from place search's ticket 07, "Go here" from a landmark's routes near here (`.scratch/place-search/`, merged for 0.4.1), and takes in footbridges' ticket 04, the walk hint (`.scratch/footbridges/`).

Words as in `CONTEXT.md`.
- **Option**: one way to get there on one ride, as the owner calls it. One direction, a hintuan to board at and one to get off at.
- **Walk to board**: from the commuter to the boarding hintuan.
- **Walk from your stop**: from the hintuan where they get off to the place.

## What Para has today

- **Place search** finds Para's places and OpenStreetMap landmarks (`.scratch/place-search/`).
- **"Go here" on a landmark** (ticket 07 there):
  - opens a hintuan's routes;
  - a route picked there opens its trip with its end picked at its hintuan nearest the landmark;
  - the trip card says "About N m to …, in a straight line".
- **The trip card** prices a ride between a start and an end (`useRideTo`, `pickedFareFor`), and its "Other routes" lists routes sharing an end (Q146, kept by the route card session's new trip detail).
- **The published index** (`/data/index.v5.json`) holds what one-ride options need:
  - every direction's simplified line (`overview`) and its length;
  - every hotspot's point;
  - the order each direction passes its hotspots (`links`: `stop_sequence`).

  The full lines are separate files, fetched per direction.
- **The commuter's position** comes from the locator, only while the page is open and location is on.

## Phase 1

### 113: Go here from any searched place

From a searched place (a Para place or a landmark), "Go here" lists every one-ride option from where the commuter is, ranked by least walking.
- **The start** is the commuter's position. With location off, Para asks for it once and falls back to Q2's answer.
- **The options** are every direction that passes a hintuan within walking reach of the start (Q1) and, later along the same direction (by `stop_sequence`), a hintuan within walking reach of the place.
  - One option per direction: its best pair, least total walk.
  - A loop counts its order round from its tip.
- **Ranked by total walk** (to board + from your stop), straight-line, then by ride length.
- **Each row** shows the route (its mode and the direction's name), its signboard, the walk to board, the walk from your stop, and the fare.
  - The fare is the direction's rule over the ride's length along its line, from the full line fetched for the rows on show (02).
- **A row picked** opens its trip with the start and the end already picked, as ticket 07 picks the end, and the walk shown (116).
- **None:** "No one-ride way there yet", with the nearest places Para has, so the commuter is never left with nothing.

### 114: Other routes for this ride

- **On the trip card:** the other options for the same start and place, so a commuter can switch without going back.
- **Not a new list.** The route card session's new trip detail already keeps "Other routes" (Q146): this fills it with this ride's options when the trip came from Go here, and leaves it as it is otherwise. Coordinate with that session; no fork of the component.

### 115: Re-plan from here

- **A button on a trip opened from Go here:** the options again, from where the commuter is now (they walked to another corner, or the jeep took a turn).
- **Same rules** as 113, the same place.

### 116: Honest walking

Today's walk is "About N m to …, in a straight line". 116 makes every walk in Go here say what Para knows and no more:
- **On the map:** a dashed straight line for each walk (to board, from your stop).
- **On the card:** "about N m in a straight line".
- **"Open in your maps app":** hands the walk to the phone's own maps for a real path.
  - Android: a `geo:` link; iPhone: `maps://`.
  - On a computer, the link opens openstreetmap.org's directions.
  - No Google API, no public router at runtime; the phone's app is the commuter's choice (Q4).
- **The footbridge hint** (footbridges ticket 04, folded in here): when a straight walk crosses a major road, the card names the nearest footbridge over it within about 300 m. "Cross Commonwealth Ave by the footbridge 120 m north (elevator)", or "no footbridge mapped nearby".

## Phase 2

### 117: A get-off reminder while Para is open

- **What it says.** While a trip from Go here is open and location is on, Para counts down to the commuter's stop: "2 hintuans to go", then "Bababa ka na sa susunod".
  - It counts by hintuans when the line has them between, and by distance when it hasn't.
  - Optional vibration.
- **Limits.** Only while Para is open. No reminder with the phone locked; Para has no background service on the web (Q6).

## Later: 119

Each is designed twice before it is built (two designs side by side, their costs, a recommendation). Phones read only published files (ADR 0001).

- **A hintuan graph built at publish time.**
  - Hintuans as nodes, rides along a direction and short walks between nearby hintuans as edges.
  - Searched with Dijkstra, one transfer first. Published as a file the phone reads, for options with a change of ride.
- **Real walks precomputed at publish time.**
  - Walking paths from OpenStreetMap's footways, crossings and footbridges, between each hintuan and what is near it, published as files.
  - The straight lines and the "open in your maps app" button stay until then.
  - Footbridges' ticket 05 (the walking graph in the browser) is this item's other design.

## Built ahead of the design, and what waits for it

**Can be built before the owner's design** (the owner's rule):
- the logic and the data: options, ranking, walk distances, the fare over a ride, the countdown, the graph file;
- stories that use existing components.

**Waits for the owner's design:** every new screen and every new row look ("Owner designs first" below).

## Tickets

| # | Ticket | Phase | Status |
| --- | --- | --- | --- |
| 01 | [One-ride options: finding and ranking](issues/01-one-ride-options.md) | 1 (113) | built: logic only |
| 02 | [The options list](issues/02-options-list.md) | 1 (113) | waits for the owner's design |
| 03 | [Other routes for this ride](issues/03-other-routes-for-this-ride.md) | 1 (114) | ready-for-agent after 01; coordinate with the route card session |
| 04 | [Re-plan from here](issues/04-replan-from-here.md) | 1 (115) | after 02; its button waits for the owner's design |
| 05 | [Honest walking](issues/05-honest-walking.md) | 1 (116) | logic ready-for-agent; the dashed line and the button wait for the design |
| 06 | [The get-off countdown](issues/06-get-off-countdown.md) | 2 (117) | built: logic only |
| 07 | [The get-off reminder](issues/07-get-off-reminder.md) | 2 (117) | waits for the owner's design |
| 08 | [A hintuan graph, one transfer: design it twice](issues/08-hintuan-graph.md) | later (119) | research |
| 09 | [Real walks at publish time: design it twice](issues/09-published-walks.md) | later (119) | research |

## Owner designs first

Never made up. Each needs the owner's Figma before its ticket draws it:

1. "Go here" on a searched place: where the button sits, for a Para place and for a landmark (today's landmark "Go here" rows included).
2. The options list (02): the screen or sheet, a row (route, signboard, walk to board, walk from your stop, fare), the order's labels, the empty state, loading while the full lines come, and location off.
3. The trip card's Go here parts: the walk lines (to board, from your stop), the footbridge hint, "Open in your maps app".
4. The dashed straight walk on the map: colour, dash, width, and how it meets the pins.
5. "Re-plan from here" (04): where it sits and what it says.
6. Other routes for this ride (03): only if the new trip detail's "Other routes" needs a different look for a ride's options.
7. The get-off reminder (07): banner, sheet or card; the countdown's words in Filipino and English; the vibration's setting.
8. Options with a change of ride (119): how a transfer reads in a row and on the map.

## Questions for the owner (each with a recommendation)

1. **Walking reach for boarding and getting off?** Recommended: 600 m straight-line each way (about 8 minutes on foot), widening to 1 km only when nothing is within 600 m, said so on the list.
2. **Location off: where does the ride start?** Recommended: ask once to turn location on. If not, the commuter picks a start with place search, the same field. Never the map's centre, which is not where they are.
3. **How many options?** Recommended: every one within reach, best first, the first five on show and the rest behind "More ways". The fares and full lines are fetched for the rows on show only.
4. **"Open in your maps app": which app?** Recommended: the phone's own (Android's `geo:` link lets the commuter choose; iPhone's Apple Maps), and openstreetmap.org on a computer. No Google link, as the brief rules out Google.
5. **Fares on the list: the full line or the overview?** Recommended: the overview's length for the order, the full line's for the fare shown. A row says its fare once its line has come, never a guess.
6. **The get-off reminder: words and vibration?** Recommended: "2 hintuans to go", then "Bababa ka na sa susunod" (Taglish, as the owner wrote it). Vibration off until the commuter turns it on, as some ride with the phone in a pocket. Only while Para is open, said so the first time.
7. **Kept between visits?** Recommended: no, as every pick today. A reload starts from the map; nothing about where a commuter goes is stored.

## Answers (the owner, 2026-11-11, via the hub: all as recommended, Q171 to Q178)

1. 600 m straight-line each way; widened to 1 km, said so on the list, only when nothing is within 600 m.
2. Ask once to turn location on; if not, a start picked with place search. Never the map's centre.
3. Every option, best first; five on show, the rest behind "More ways".
4. The phone's own maps app (`geo:` on Android, Apple Maps on iPhone), openstreetmap.org on a computer. No Google.
5. A row's fare only once its full line is read, never a guess.
6. "2 hintuans to go", then "Bababa ka na sa susunod". Vibration off until turned on. Only while Para is open, said so once.
7. Nothing kept between visits.
8. (Q178, the footbridge hint's roads) `major-roads.v1.json`, built monthly beside the footbridges, only the major roads near hintuans, fetched only with a Go here walk and never on the opening path; a ceiling of 500 kB.

The screens still wait for the owner's designs ("Owner designs first" above).

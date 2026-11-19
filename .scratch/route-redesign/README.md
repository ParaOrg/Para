# Route card and route detail redesign

The owner's new route card and route detail (the trip view after a tap), built in small pull requests into `staging`, one component each, by the ds-component skill. Each comes with stories and tests, and each asks the hub before it merges. Relayed by the hub on 2026-11-19.

## Figma (file `MGPQFPjemLbzjNqAI5Ny4D`)

| Node | What |
| --- | --- |
| 4796:30411 | New Route Detail |
| 4633:19780 | New Route Card (and its stacked list) |
| 4795:20406, 4796:33201, 4796:29755, 4796:30124 | Connected components |
| 4796:33161 | Desktop |
| 4796:51223 | Mobile |

The hub's survey below maps the frames onto today's code. It was read from Figma, so each issue checks its part against the frames before it builds.

## What changes

**The card (`src/features/routes/cards/`):**
- `RouteEndPointBar` becomes a destination row:
  - a circle-arrow icon;
  - the place in Bold 18/26;
  - a "via" notes line in Medium 14/20.
- `RouteCard` is restyled:
  - the origin in Bold 28/32;
  - a road header that shows only an icon (the `ul`'s `aria-label` stays, so the mode is still said in words);
  - darker fills.

**The detail:**
- `TripEndsCard` becomes two cards, Start and End, with the swap between them and the via line under End.
- A new "View N more routes" disclosure at the top holds what `trip-other-routes.tsx` shows today. That file retires.
- New ride pills: the mode, and later the time.
- `TripSignboards` is restyled, with a "Signboard" heading.
- `TripTiles` is restyled: the fare tile on the left, the distance on the right.
- The timeline is restyled: a flat rail in the route's colour, and a green Start pill and a red End pill.
- On desktop the detail docks full height on the left, 393 wide like the list. On mobile it is the sheet.

**The model:** departures and `byPlace` (`src/features/routes/model/departures.ts`) return `to` and `via` apart. Today `directionRowName` (`model/routes.ts`) bakes them into one string.

## The owner's decisions (2026-11-19)

1. **Tokens.** Figma has new semantic variables and new primitives (a 15-step scale). The current semantics are deprecated but stay: nothing is deleted.
   - The new primitives and semantics are added beside the old (`/sync-tokens`).
   - New and restyled components use only the new semantics. Old code keeps the old.
   - Colours are Figma's, including the darker card fills and End's red-700.
2. **The font.** Figma's family is Livvic, the owner's design call. Whether it covers the whole app or only the redesign is still being confirmed, so no font change yet.
3. **Hidden for now:** the time pill ("30–60 min") and "Night only". The approach to time estimates is still under discussion. "via" shows now.
4. **Controls.** Today's Controller, back and ✕ stay. The owner designs new ones later.
5. **The timeline.** Tapping a stop still picks it. Folding goes.
6. **Rail, ferry and loop.**
   - The pill reads, for example, "LRT 1 · Northbound".
   - Station codes stay.
   - A loop shows one card, with no swap.
7. **Copy:** "View N more routes", and "1 more route" for one.
8. **Small defaults:**
   - The End pill carries an E icon.
   - A fare is written ₱23–24.
   - The same place name on top and in the timeline.
   - Long names wrap.
   - No cap on a card's rows.
   - A destination row in the detail opens that trip.
   - Walk and line notes go under the timeline.
   - With no fare, distance takes the full row. The ferry shows Free.
   - The desktop dock is full height.
   - Old parts are deleted in the pull request that replaces them.
9. **Not to build yet:** a route card list that always shows, with nearby routes within a radius. That is a new list mechanic, still under discussion.

## Rules for every pull request here

- **Test ids stay:** `chooser-*`, `card-*`, `trip-*` and `data-direction`. The suites rely on them.
- **No file over 150 lines.** `trip-card.tsx` (261 lines) and `timeline-route-detail-card.tsx` (204) are split, not grown.
- **Each pull request:**
  - restyles one component;
  - uses only the new semantics;
  - adds or updates its stories (Storybook plays where it is interactive);
  - is reviewed by `ds-reviewer` before it opens;
  - merges only with the hub's OK.

## Issues, in order

| # | Issue |
| --- | --- |
| 01 | [Tokens: the new primitives and semantics, beside the old](issues/01-tokens.md) |
| 02 | [Two icons: circle-arrow-right and hourglass](issues/02-icons.md) |
| 03 | [The model: `to` and `via` apart](issues/03-to-and-via.md) |
| 04 | [The destination row](issues/04-destination-row.md) |
| 05 | [RouteCard restyled](issues/05-route-card.md) |
| 06 | [Start and End cards, with the swap](issues/06-start-end-cards.md) |
| 07 | ["View N more routes"](issues/07-more-routes.md) |
| 08 | [Ride pills](issues/08-ride-pills.md) |
| 09 | [Signboards](issues/09-signboards.md) |
| 10 | [Tiles: fare and distance](issues/10-tiles.md) |
| 11 | [The timeline](issues/11-timeline.md) |
| 12 | [The shell: docking, wiring, e2e and stories](issues/12-shell.md) |

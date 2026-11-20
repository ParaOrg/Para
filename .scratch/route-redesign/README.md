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
2. **The font.** Livvic replaces SN Pro everywhere, as its own small pull request after the tokens (issue 13). Its woff2 files are self-hosted in `design-system/foundation` like SN Pro today, with no Google Fonts link, so the CSP stays as it is. Its licence file sits beside the fonts.
3. **The travel time** is Para's own estimate (issue 14): the route's length over a typical speed range for its mode, plus a small dwell per stop. It is shown as "~30–60 min" and labelled an estimate. Google is not used. Real times from contributor rides come later (issue 17). "Night only" stays hidden. "via" shows now.
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
9. **The nearby list** (issue 15, the last issue, after the restyle). The route card list always shows, for places near the commuter, nearest first:
   - It starts within 1 km. With fewer than about 5 cards, it widens step by step up to 3 km. It is never empty: past 3 km, it shows the nearest few.
   - It looks from the commuter's place after they tap "locate me", or from a place or route they tap on the map. Both work on phone and desktop. With no location, it looks from the map's centre. It does not refresh on its own while the commuter moves.
   - While a trip is open, the trip replaces the list, as today. Closing the trip brings the list back. There is no strip underneath for now.
   - No distance label on the cards for now. The owner will design it as a later feature.
10. **The deprecated semantics** are deleted only after every screen uses the new ones, in one clean-up pull request with the owner's OK (issue 16).
11. **Two building sessions** share the work, each owning its own files and asking the hub before each merge:
    - One builds 02 to 05, 18, 11 and 12: the icons, the model, the destination row, the RouteCard, the Overview button and still camera, the timeline, and the detail's shell and wiring.
    - The other builds 06 to 10, then 13 and 14: the detail parts, the font, and the travel time.
    - `TripEndsCard` keeps its file and name (issue 06). The shell passes it `via` from `timeline-route-detail-card.tsx` once issue 03 has landed.
12. **A still camera, and an Overview button** (the owner, 2026-11-19; issue 18, after 05 and before the shell). Opening a trip fits its route once, as today; after that the camera moves only when the commuter moves it. An "Overview" button brings back the fit.

## Owner to confirm

Calls the builders made where Figma draws nothing, or where a number is Para's own. Each is in its pull request's description.

- **The timeline:** the points listed under "Not drawn in Figma; built as today's behaviour, owner to confirm". There are six numbered points, then the pressed row and the notes text. [#1098](https://github.com/ParaOrg/Para/pull/1098)
- **The tiles:** hover and pressed on the fare's button, which Figma doesn't draw. [#1097](https://github.com/ParaOrg/Para/pull/1097)
- **ExtraBold to Bold:** Livvic has no ExtraBold, so each `font-extrabold` became `font-bold`. The full list is under "No ExtraBold in Livvic". [#1099](https://github.com/ParaOrg/Para/pull/1099)
- **The travel-time speeds:** the speed range and stop dwell per mode, under "How it's worked out". [#1103](https://github.com/ParaOrg/Para/pull/1103)
- **The loop pill:** long loop names wrap inside the pill. [#1096](https://github.com/ParaOrg/Para/pull/1096)
- **The shell:** the dock's width (384, where Figma draws 393) and the mobile notch, kept as the drag cue. Both are under "Not drawn in Figma; built as today's behaviour, owner to confirm". [#1104](https://github.com/ParaOrg/Para/pull/1104), still open.

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
| 13 | [Livvic everywhere](issues/13-livvic.md) |
| 14 | [The travel-time estimate](issues/14-travel-time.md) |
| 15 | [The nearby list](issues/15-nearby-list.md) |
| 16 | [Delete the deprecated semantics](issues/16-deprecated-tokens.md) |
| 17 | [Travel times from contributor rides (later)](issues/17-ride-times.md) |
| 18 | [An Overview button, and a still camera](issues/18-overview-button.md) |

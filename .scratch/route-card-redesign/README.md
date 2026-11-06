# Route card redesign

The owner's new RouteCard and its list, built in small pull requests into `staging`. The owner said yes to this plan on 2026-11-06.

## Figma (file `MGPQFPjemLbzjNqAI5Ny4D`)

| Node | What |
| --- | --- |
| 4629:22776 | The RouteCard set: Jeep blue, UV Express grey, E-Jeep near-white, Bus orange |
| 4633:19780 | RouteCardStackedList: edge to edge; a same-mode run shows its header only on its first card; RouteCardRailway with station codes |
| 4633:22034 | Desktop: the list docked full height on the left, 368 wide; a Controller column with ✕, then ⇆ (switch) and sliders (filter) |
| 4633:25516 | Mobile, at 768 and 393: the Controller stuck to the sheet's bottom, the cards scrolling under it |
| 4633:25526 | The rest and selected shadows |
| 4633:25575 | The mobile sheet at Max, filling the whole screen |
| 4261:15199 | Ferry and MRT/LRT-2, which keep their own looks |

New variables: `Card/{Jeep,UVExpress,Ejeep,Bus}/{…-surface, …-surface-secondary, …-surface-border, …-on-surface}`. "Card (Depreciated)" is the old group.

## The owner's decisions (2026-11-06)

1. **RouteCard only.** The cards and the list change; the route detail (the trip view after a tap) stays as it is until new frames come.
2. **The list header goes** ("N Routes", Switch). The Controller replaces it.
3. **Taps work as before.** No selected look of its own: the highlight shows only on a tappable route-end row, and tapping it opens that route's detail. The cards wear the rest and selected shadows of 4633:25526.
4. **Filter (sliders):** designed by the builder for now, from existing primitives and tokens. Options: All, Jeep, E-Jeep, Bus, LRT, MRT, Ferry.
5. **States Figma doesn't draw** (loading, empty, error, very long names, 20+ routes): designed by the builder for now. Today's states restyled; long names wrap; an empty state for a filter with no matches.
6. **Map route lines take the mode colours.** Jeep blue (the terminal pin is cyan, so it stays distinct). E-Jeep's near-white and UV's grey must stay visible on the light basemap: each mode's `-surface-border`, or a darker shade.
7. **Blue for Jeep is fine.** The old rule that blue means selected is dropped, in comments and docs too.
8. **Modes:** Ferry and MRT/LRT-2 keep their own looks, and trains their Map/Rail colours. Tricycle is not drawn for now. P2P borrows UV Express until it is drawn.
9. **Operator logos** (PISTON, CITYBUS) stay out until the database has an operator field.
10. **The old mode colours go:** the `--card-{orange,violet,rose,fuchsia,pink}-*` tokens, `CARD_COLOURS` and `CARD_PALE_COLOURS`, `JEEPNEY_LIVERIES` and `liveriesFor`, and `button-look.ts`'s card fills. `studio/panels/line-detail.tsx` and `contribute/history/card-status-line.tsx` are re-pointed. `card-red-*` and `card-green-surface-light` stay: they mean Start and End.
11. **Mobile sheet:** the drag and the Low / Middle / Max snaps stay; Max fills the whole screen. No handle unless Figma draws one; no scrollbar.
12. **The studio** uses the same list, layout and filter. Its trip card keeps its editor extras.
13. **Station codes** ("PL01") from `rail-codes.ts` where one exists, otherwise nothing. The S and E icons beside them go.

## Status (handed over 2026-11-06)

This session stopped here; the owner's own sessions carry on. Each PR is stacked on the one before: #780 holds #779's tokens (merged), #781 holds #780, and the step 4 branch holds #781. Their own edits to this README will conflict with this version when they merge: keep this one.

| # | Step | Status |
| --- | --- | --- |
| 1 | Tokens: the mode card variables, added only | Merged: [#779](https://github.com/ParaOrg/Para/pull/779) |
| 2 | Deletions, and mode → look (decisions 10 and 7) | Merged: [#780](https://github.com/ParaOrg/Para/pull/780), 412.5 kB. Its phone-test failure was the suites, not the app: they looked up the deleted `card-<livery>-surface-pale`; the dots along a road ride's rest ring in Map/RouteLine/surface-default |
| 3 | RouteCard restyle | Merged: [#781](https://github.com/ParaOrg/Para/pull/781), 412.6 kB. Its profile-test failure did not come back on a fresh run |
| 4 | RouteCardStackedList, with the railway card | Open PR: [#786](https://github.com/ParaOrg/Para/pull/786). The reviewers' findings below are fixed |
| 5 | The Controller, with the filter | Open PR (branch `claude/route-card-controller`): the filter and its empty state designed for now |
| 6 | Sheet layout: docked on desktop, the mobile Controller at the bottom, Max full screen | Not started |
| 7 | Commuter map wiring | Not started |
| 8 | Studio wiring | Not started |
| 9 | Map lines in the mode colours | Not started |

### Step 4: the reviewer's findings, fixed

1. **A run can lose its mode's name.** `showsMode` turns off when the card before has the same livery, but a card draws its mode only when its first row has a vehicle. P2P (UV Express's colours) and tricycle (Jeep's) have none, so a run led by one draws no name at all (the unit test's `Tala|uv-express` before `Bigte|uv-express` shows it). Fix: compare what the previous card drew, the `MODE_LABEL` of its first row's `vehicleOf`, not the livery; add a story with a P2P card leading a run.
2. `route-card.stories.tsx`, `MixedModes`: the play looks for "Jeepney"; the card says "Jeep".
3. `route-card-stack.tsx`: `PickedPlace.card` and the component's comment still say a card per place; it is now a card per place and mode, run by mode.
4. `route-card-railway.tsx`: a comment cites "RouteCardStackedList, 4633:25360"; that node is RouteCardRailway.
5. `route-card-railway.tsx` and `railway-badge.stories.tsx` join classes with `+`; use `cn()`.

A second review found three more `+` joins in `route-card-railway.tsx` and a comment left unwrapped; fixed too, with `AStation`'s play, which looked for the wrong test id.

### Step 5: what the Figma says, and what was built

- **Controller** is a component set (4633:22010). Default (phones): a row, ✕ bottom left, ⇆ over the filter bottom right, padding 0 24 32 24, the items at the bottom. Variant2 (desktop): a column 88 wide beside the 368 list, ✕, then 8, then ⇆ and the filter 16 apart, padding 20 20 32 20. Each is IconButton Special Large; Figma fills the drawings with Brand/surface. The icons are `closeLarge`, `arrow-left-right-large` and `filter-large`, 28 square (export them from 4633:22012, 4633:22014 and 4633:22015).
- ⇆ takes over SWITCH: its label stays the way it leads to (Pabalik, a train's bound), and it keeps `data-testid="chooser-flip"` and `data-back` for the suites.
- **The filter, designed for now:** the sliders open a card in the middle of the screen (the page's own `popover`, so Escape, a tap outside and the focus come free), with "Show routes" and one choice of All, Jeep, E-Jeep, Bus, LRT, MRT or Ferry as native radio buttons. A choice applies at once; a tap, Enter or Space closes the card, while the arrow keys only move through the choices. While a filter is on, a dot sits on the sliders and the button's name says which ("Filter: Jeep"). An empty result says "No Jeep routes here" with a way back to All. LRT keeps both light-rail lines, MRT the metro. The filter keeps rides by vehicle, not by card colour, so UV Express (left out of the owner's options), P2P and tricycle show under All only.
- Built: `model/mode-filter.ts` (with `tests/unit/mode-filter-test.mjs`), `cards/mode-filter-card.tsx`, `cards/mode-filter-empty.tsx` and `cards/route-list-controller.tsx`, each with stories; the icons are in `shared/ui/route-icons.tsx`. Not wired into the list yet: steps 6 and 7 do that.
- The filter has not been checked against other apps (Mobbin): it waits for the owner's own design.

### Learned on the way

- **Size:** MapLibre, React and the shared code together were 412.9 of 413 kB at the start; step 2 brought it to 412.5, step 3 to 412.6 (`node --experimental-strip-types scripts/checks/health.mjs` after `npm run build`). There is very little room: measure every PR.
- **Card keys** are now `${place}|${livery}` for a road card (`Tala|jeep`); stories and tests that held a card Selected by its place name were changed to match.
- **A local browser suite** needs a dev server on its own port (`npx vite --port 5197 --strictPort`, then `PARA_BASE=http://localhost:5197`). Rebuilding Storybook, or editing a file under the repo, while it runs makes Vite reload the page and the suite crash on `window.__map`. In this container the project's Playwright wants browser build 1248 while 1243 is installed: point `PLAYWRIGHT_BROWSERS_PATH` at a folder that links `chromium_headless_shell-1248` to `/opt/pw-browsers/chromium_headless_shell-1243`.
- **Story plays are not checked by CI.** Storybook's `currentRender.phase` reads `finished` even when a play throws, so it proves nothing. Listen instead for the preview channel's `playFunctionThrewException` and `unhandledErrorsWhilePlaying` on a static build: wrap `window.__STORYBOOK_ADDONS_CHANNEL__`'s `emit` in an init script (a Playwright `addInitScript`), guarding `JSON.stringify`, which DOM arguments break.
- The map-colours test's name converter now splits an acronym (`UVExpress` → `uv-express`).

## Token naming

Figma's leaf names repeat their group (`Card/Jeep/Jeep-surface`). The tokens drop the repeat: `--card-jeep-surface`, `bg-card-jeep-surface`. Camel case splits as the train lines' do (`UVExpress` → `uv-express`).

## Choices made for now

- **A card's colour is its mode's** (`liveryOf`): the first row's route's mode, a train's line or the ferry. Tricycle and any mode with no look wear Jeep's, the commonest; P2P wears UV Express's.
- **Past a picked hintuan** the rest of a trip's line had its card's pale. The modes have no pale variable, so a road mode's rest of the ride is drawn as a line at rest (Map/RouteLine/surface-default). Trains and the ferry keep their own pale.
- **A trip's rail and a pressed row** take each mode's `surface-secondary`, its darker step, where the old liveries had Timeline/surface.
- **On the light cards** (UV Express, E-Jeep) the picked hintuan's pill is dark (on-surface) with the card's colour for words, as MRT-3's yellow does; the mode chip's vehicle is in on-surface.
- **Lit lines** for UV Express and E-Jeep are their `surface-border` with dark chevrons, until step 9 checks them on the basemap.
- **Draft** in the studio's line detail and **Retry** on the contributor's history keep their orange (orange/700) through a provisional `Content/warning` token, not named in Figma yet.

- **The list's order** is by mode: Jeep, UV Express, E-Jeep, Bus, then the trains and the ferry, each mode's places in the order met. A place with two modes is two cards.

## The owner's answers (2026-11-06)

- **One shadow look everywhere.** The new Route/RouteCard… shadow values (4633:25526) go into the `shadow-route-card-*` tokens, and the HintuanCard's boxes and the contributor page's tracking button take them too. Not applied yet.
- **Border/tertiary becomes neutral/300**, as Figma has it, in its own small PR that lists everywhere it shows. Not done yet.
- **Brand/surface-pale** (`color/parabrand/100`) is in Figma and not in the code. Nothing uses it yet; it is added when something does.

## Owner to design later

The builder designed these for now, or left them out. Each waits for the owner's frames:

- the filter's card (ModeFilterCard: a centred popover of radio buttons), the dot on the sliders while a filter is on, and the empty state of a filter with no matches (ModeFilterEmpty);
- the loading, empty, error and long-content states;
- the studio's version (the owner is revamping it all);
- the route detail's new frame;
- the S and E icons beside station codes;
- operator logos;
- tricycle and P2P looks;
- the map line colours for E-Jeep and UV Express.

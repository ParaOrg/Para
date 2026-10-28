# Codebase review 2026-10-28: The public map and routes

Two bugs commuters can hit today. Tapping a terminal (Tala, SM Fairview) opens a card that lists no routes at all. And after SWITCH, a hintuan picked on a trip can drop off the card while the map still shows it.
The page also has no safety net: one crash anywhere blanks the whole map. When the map is slow to load it shows a red failure box full of technical text, and a commuter who cannot tap the map has no way into any route.
The rest is in good shape: the route rules are pure, well tested and checked against the official fare tables. Lint is clean and all 1,172 unit checks pass.

Checked by reading every file in `src/app/public-map/` and `src/features/routes/` (stories skimmed), running `npm run lint` (clean) and `npm run test:unit` (1,172 pass), small Node scripts against the model, a Playwright script against the dev server, and `commuter-test`. That suite was stopped by my own 15-minute limit after 630 checks passed, 0 failed and 0 skipped. It is slow in this container rather than broken.

## Findings

### public-map-01: A terminal's card lists no routes

- Severity: bug
- Where: `src/features/routes/cards/hintuan-card.tsx:110-127` (the routes come only from `linkedDirectionIds`), `src/features/routes/map/use-saved-hotspots.ts` (`linkedDirectionIds` reads `links` only), `public/data/index.v5.json` (no terminal has a link)
- What happens: a commuter taps the Tala Jeepney Terminal box on the map. The card opens with "Tala" and one row for the terminal, and nothing under it: no route cards and no counter. Yet Tala – SM Fairview starts there. SM City Fairview Jeepney Terminal, where 8 directions end, shows the same empty card. I confirmed it in the browser on the dev server (screenshot taken). In the published index, 5 of the 6 terminals have no link at all; only the loop's terminal has one. The card reads only links, and the routes' head and tail are never consulted. Commuters notice; no test covers it.
- Fix: on the card, count a direction as stopping at a terminal when the terminal is its route's head or tail (`directionEndHotspots`), as well as by its links. Add a unit or browser check that a terminal's card lists the routes that start there. Why the links are missing is noted under "Outside my area".
- Size: S
- Owner decides: yes (what the terminal's card shows)

### public-map-02: After SWITCH, the picked hintuan can vanish from the trip card while the map still shows it

- Severity: bug
- Where: `src/features/routes/map/use-ride-to.ts:245-268` (`carryTo`'s `land`), `src/features/routes/model/places.ts:78` (`boxTheOtherWay`), `src/features/routes/model/timeline.ts:141` (a row keeps its first box's id)
- What happens: some places have two boxes along the road, for example "SM Gate 1" and "SM Gate 2" under the one informal name "SM", and both directions pass both boxes. Papunta reaches Gate 1 first, so its row's id is Gate 1. Pabalik reaches Gate 2 first, so its row's id is Gate 2. A commuter picks SM on Papunta and taps SWITCH. `boxTheOtherWay` keeps Gate 1, because Pabalik passes it too. But Gate 1 is not a Pabalik row id, so:
  - no row on the card shows as picked, and the pill disappears;
  - the map still shows the pin and the cut ride;
  - the fare tile prices a ride that no row on the card shows.
  I reproduced it with `timelineFor`, `boxTheOtherWay` and `carryPicks`: Papunta's rows are `[A]`, Pabalik's are `[B]`, and the carried pick is `A`. `switch-pick-test` and `other-way-test` only use one box per side of the road. Commuters notice.
- Fix: after landing a pick, map the box to the row id of its place in the other direction's timeline (the row whose place key matches). Add that two-box case to `switch-pick-test`.
- Size: S
- Owner decides: no

### public-map-03: No error boundary, so one crash blanks the whole public map

- Severity: robustness
- Where: `src/app/public-map/main.tsx:49-53`; there is no `src/shared/ui/error-boundary.tsx` anywhere in `src/`
- What happens: any error thrown while rendering, in a card, a marker or a livery lookup, unmounts the whole React tree. The commuter gets a white page with no message and no way back other than a reload. `.claude/CLAUDE.md` asks for "a single one in `shared/ui/error-boundary.tsx`" and for each page to be wrapped. Nobody notices until it happens.
- Fix: add the one boundary in `shared/ui/` and wrap `PublicMapApp`. Wrap the cards separately as well, so a card's crash closes the card and leaves the map up. The fallback needs words from the owner ("Something went wrong. Reload").
- Size: S
- Owner decides: yes (the fallback's words and look)

### public-map-04: The "map failed to load" box is technical, offers no way out, and can cover a map that is working

- Severity: robustness
- Where: `src/features/routes/map/map-view.tsx:475-497` (the banner), `:103` (`LOAD_TIMEOUT_MS`), `src/features/routes/map/framing.ts:165-184` (`loadClock`)
- What happens:
  - The banner shows the raw MapLibre message, then the WebGL renderer, the canvas sizes, the event trace and the tile URL. `.claude/CLAUDE.md` says messages "say what happened and what they can do. Don't show raw error objects". There is no Try again or Reload button.
  - On the public map the clock restarts at the style's load. A commuter on a slow connection whose basemap tiles take more than 12 s after that (about 400 kB in the framed view) sees the red box over a map that already shows its routes. The box goes away only when 'load' finally comes.
  - It is coloured with raw Tailwind reds and greys (`bg-red-50`, `text-red-900`, `text-neutral-500`) although `surface-error`, `content-error` and `border-error` tokens exist.
  Commuters on slow phones notice.
- Fix: show commuters one plain sentence with a Reload button. Keep the diagnostics for the studio or a dev build. Don't raise the timeout banner once the routes are drawn (`routesDrawn`). Use the error tokens.
- Size: S
- Owner decides: yes (the words and look)

### public-map-05: A commuter who cannot tap the map has no way into any route

- Severity: standard
- Where: `src/app/public-map/public-map-app.tsx` (the only ways in are taps on the map, `route-taps.ts` and `hotspot-taps.ts`)
- What happens: every route, hotspot and trip opens only from a tap on the canvas. A screen-reader or keyboard-only commuter can focus the map and pan it, but cannot open a route, a hintuan or a list. `.claude/CLAUDE.md`: "Anything shown only on the map must also be available as text for screen-reader users." Commuters who use assistive technology notice.
- Fix: the smallest step is a visually hidden "Routes" button that opens the route list for everything on screen (`RouteCardList` with the routes and hotspots in view), so the existing cards do the rest. A real search or list is a design for the owner.
- Size: M
- Owner decides: yes

### public-map-06: The browser suites pass only on today's data, skip silently, and wait by the clock

- Severity: test
- Where: `tests/e2e/lib/harness.mjs:31-40` (`skip` is not counted), `tests/e2e/phone-test.mjs` (38 `skip(`), `commuter-test.mjs` (8). Fixed `waitForTimeout` calls: phone-test 65, commuter-test 49, where-test 26, loop-test 22, regression-gestures 20, hotspot-test 9
- What happens:
  - The public-map suites read the live published map. When a nightly publish moves or removes the hintuan a check relies on, the check prints SKIP and the run still ends "N passed, 0 failed". 46 checks can quietly stop proving anything, and nobody would see it in CI's result.
  - Around 190 fixed waits stand in for "the camera settled" or "the card re-rendered". Any of them can fail on a slow runner. In this container, commuter-test had not finished after 15 minutes.
  - Neither 01 nor 02 is caught by any suite.
- Fix: make `tally` print and count skips, and fail when skips go over a small set number. Give the checks that matter (the ride, SWITCH, terminals) a fixture map, as loop-test already does. Replace waits with `waitForFunction` on the state being read (camera `idle`, a `data-` attribute), a file at a time.
- Size: M
- Owner decides: no

### public-map-07: `as` casts that silence the compiler, and one boundary with no validation

- Severity: standard
- Where:
  - `src/features/routes/published/fetch-index.ts:82,84` (`shape as number | undefined`)
  - `getSource(...) as GeoJSONSource` in `direction-arrows.ts:353`, `babaan-sides.ts:76`, `pass-stretches.ts:119`, `use-saved-hotspots-layers.ts:49,91`, `use-saved-routes-layers.ts:56,80`, `recording-trail.ts:133`
  - `as never` on MapLibre expressions in `saved-hotspots-layers.ts:138,182,206,207`, `saved-hotspots-labels.ts:42`, `lighting.ts:34`, `line-style.ts:35`, `saved-routes-layers.ts:66,81`, `pass-stretches.ts:130`, `use-saved-routes-layers.ts:104,107`, `use-saved-hotspots-layers.ts:108`
  - `basemap.ts:188`: the fetched style JSON goes `as StyleSpecification` with no check
- What happens: none is wrong today, but each one turns off the type check that would catch the next mistake. `as never` in particular accepts any expression at all. The `.claude/CLAUDE.md` rule is "Don't use `as` to silence errors" and "Zod at every boundary". Nobody notices yet.
- Fix:
  - Add `schema: z.optional(z.unknown())` to `indexOutlineSchema` and narrow with `typeof`.
  - Use MapLibre 6.7's own `map.getSource<GeoJSONSource>(id)`.
  - Type the expressions as `ExpressionSpecification` or `FilterSpecification`.
  - Check the style for `version`, `sources` and `layers` before dressing it.
- Size: M
- Owner decides: no

### public-map-08: A hintuan no route passes shows an empty card with no word of why

- Severity: standard
- Where: `src/features/routes/cards/hintuan-card.tsx:191` (the routes block only renders when `shown.length > 0`)
- What happens: a commuter taps Nova Mall, Pangarap or Bayan Simbahan. These are published hintuans that no drawn route passes. The card shows the place name and its box rows, then nothing. The commuter cannot tell an empty place from a card that failed to load. `.claude/CLAUDE.md` asks every data-driven view to handle "loading, error and empty" explicitly. Commuters notice.
- Fix: one line in the empty case, for example "No routes stop here yet", in the owner's words.
- Size: S
- Owner decides: yes (the words)

### public-map-09: Card state is pushed up to the page through an effect

- Severity: standard
- Where: `src/features/routes/cards/use-tell-shown.ts`, used by `hintuan-card.tsx:154`; `useSavedRoutes`' `cardShows` state (`use-saved-routes.ts:117`)
- What happens: the hintuan card works out which directions it shows, then a layout effect copies that list into the routes hook's state. That costs a second render of the whole page on every change, and the comments needed to keep it from looping or flashing. `.claude/CLAUDE.md`: "Never use an effect to derive state … Compute during render." Nobody notices; it's a cost to readers and to cheap phones.
- Fix: move the "what the card shows" rule (the `back`/`flipped` choice and `drawnDepartures`) into a pure function. The page can then call it with the card's inputs, and `useSavedRoutes` takes the result as an argument instead of state.
- Size: M
- Owner decides: no

### public-map-10: An open trip is not in the address, so it can't be shared or bookmarked

- Severity: standard
- Where: `src/features/routes/cards/trip-card.tsx:70` ("No link to a trip: the address does not follow the card")
- What happens: a commuter cannot send a friend "the Tala → SM Fairview trip". The back button also leaves the site instead of closing the card. `.claude/CLAUDE.md` puts "selected route" in the URL. The comment shows this was a deliberate choice, so it is the owner's to confirm.
- Fix: put the open direction's id (and the picks, if wanted) in the hash, read once at start-up. Back then closes the trip.
- Size: M
- Owner decides: yes

### public-map-11: Studio-only code lives in the routes core

- Severity: simplification
- Where: `src/features/routes/cards/hotspot-card.tsx` (used only by `studio/panels/studio-hotspot-card.tsx`), `src/features/routes/cards/direction-timeline.tsx` (only `studio/panels/save-panel.tsx`), `src/features/routes/model/signboard-svg.ts` (only `studio/data/signboards.ts`)
- What happens: a reader of `routes/` meets three files the public map never uses. Two of them also style with raw `neutral-*` classes, not tokens. The folder rules say code lives next to the feature that uses it. Nobody notices; it costs reading time.
- Fix: `git mv` them into `features/studio/` (panels and data), keeping kebab-case. No behaviour change.
- Size: S
- Owner decides: no

### public-map-12: Prop types and class joins that don't follow the house style

- Severity: standard
- Where:
  - `Props` instead of `<Component>Props`: `route-card-list.tsx:13`, `hintuan-card.tsx:17`, `route-card-stack.tsx:20`, `timeline-route-detail-card.tsx:12`, `map-view.tsx:105`
  - Inline prop object types: `end-titles.tsx:81,165`, `trip-card.tsx:96`
  - Classes joined with `+` instead of `cn()`: `timeline-route-detail.tsx`, `trip-tiles.tsx:376,383`, `end-titles.tsx` (the circle's class)
- What happens: small, but these are the files new contributors copy from. Nobody notices.
- Fix: rename to `RouteCardListProps` and the rest, move inline types to interfaces, and use `cn()`. Do it the next time each file is touched, not as a sweep.
- Size: S
- Owner decides: no

### public-map-13: Doubled and misplaced doc comments

- Severity: simplification
- Where: `src/features/routes/model/routes.ts:161-175` (the `DirectionRow` comment is written twice, back to back), `src/features/routes/map/use-saved-routes.ts:14-24` (the `Highlight` comment sits on `FULL_LINES_FROM`, and `Highlight` has none)
- What happens: an editor's hover-help shows the wrong text for `FULL_LINES_FROM` and none for `Highlight`. Nobody else notices.
- Fix: delete the first copy in `routes.ts`, and move the `Highlight` comment down onto `Highlight`.
- Size: S
- Owner decides: no

### public-map-14: The commuter's position sits at the top of the page and re-renders all of it

- Severity: standard
- Where: `src/app/public-map/public-map-app.tsx:78,182` (`where`, `setWhere`)
- What happens: with "Where am I" on, every new fix (the first, then every 50 m) sets state in `PublicMapApp` and re-renders the whole page: cards, markers and every hook. The value is used once, by `useLoopTip`, when a loop's trip opens. `.claude/CLAUDE.md`: "Keep state as close as possible to where it's used." A commuter on a cheap phone who walks with the map open pays for it. It hasn't been measured.
- Fix: keep the last fix in a ref that `useLoopTip` reads when a loop trip opens, or have `CommuterLocation` hand it over only then.
- Size: S
- Owner decides: no

## What is good

- `features/routes/model/` is pure and well tested. `ride.ts`, `ride-rows.ts`, `ride-carry.ts`, `timeline.ts` and `departures.ts` have no React or MapLibre in them. The jeepney and train fares are checked against LTFRB, LRMC and LRTA tables row by row, and every published station resolves to its fare table (checked by `check-map-data.mjs`; I re-ran it against today's index).
- The published-map reader (`published/`) is a model boundary. It is validated with Zod and has a shape number with older shapes kept for installed apps. Its stored-copy fallbacks are tested case by case (`map-file-test`), and it never reads the database.
- `line-pass.ts` (`passKey`) protects the public map from line files and an index that came from different publishes. It's a small, well-explained guard that's worth copying.
- The card-stack rules (`card-stack.ts`, `routes-shown.ts`) are plain functions with tests. The hooks only hold state.
- Every map listener is removed in its effect's cleanup, and lint is clean with every rule an error.

## Outside my area

- Approving a route rewrites its directions' links from the draft (`supabase/migrations/0022_draft_ops.sql` around line 648). The studio builds that list from hintuans only, so it appears to wipe the "Routes that stage here" links a terminal's save made. That would explain why no terminal in the published index has a link (see 01). Studio and database.
- The studio's `terminal-checklist.tsx` and `hotspot-card.tsx` style with raw `neutral-*` classes rather than tokens.

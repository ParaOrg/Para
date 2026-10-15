# Small fixes on the trip card

Four changes, one pull request each. All show on the public map and in the studio, which share the trip card. They don't depend on each other.

## 1. "Kilometer" → "Distance"

**The ask (2026-10-15):** the tile under the ride's length reads **Distance**, not Kilometer. The figure keeps its form (`16.6km`). It matches the tile beside it, which reads "Fare", not "Pesos".

**Where:**

- The label: `src/features/routes/cards/route-trip-detail.tsx`, the name under `trip-km`.
- Comments and descriptions that call it "the Kilometer tile": `src/shared/utils/geo.ts`, `src/features/routes/model/direction-schema.ts`, `src/features/routes/cards/trip-card.tsx`, `route-trip-detail.tsx`, `route-trip-detail.stories.tsx`, `tests/unit/fares-test.mjs`, `tests/e2e/phone-test.mjs`, `tests/e2e/visitor-test.mjs`, `tests/e2e/README.md`.
- The `trip-km` test id and `kmLabel` stay: they name the figure, which is still in kilometres.

**The owner:** renames the tile in Figma (3778:3183), so the design and the app agree.

**Done when:** typecheck, lint and unit tests pass; the trip card's stories show "Distance"; phone-test and visitor-test pass (they find the tile by its test id, not its word).

## 2. SWITCH keeps the picked hintuan

**The ask (2026-10-15):** on Antipolo → Recto, with Betty Go – Belmonte picked, the card shows Antipolo → Betty Go: 9.5 km, ₱12–13. Tapping Pabalik should show **Recto → Betty Go**, with its own distance and fare, not the whole of Recto → Antipolo.

**Today:** the pick belongs to one direction, on purpose. `useRideTo` (`src/features/routes/map/ride-to.ts`) lets it go whenever another direction opens: "A different direction is a different ride… start it whole." SWITCH becomes the one exception. Another route, a new trip, ‹ and ✕ still start the ride whole.

**The rule.** It is the one HintuanCard's SWITCH already follows (`hintuan-card.tsx`, `switchTo`):

1. The other direction passes the same hintuan: it stays picked.
2. It passes another box of the same place (across the road): the nearest such box is picked.
3. It passes no box of that place: the pick goes, and the ride is whole, as today.

The rule moves into one pure function in `src/features/routes/model/`, used by both cards, so they cannot drift apart.

**Also:**

- **A picked end follows its place.** Recto picked as the end of Antipolo → Recto is the start of Recto → Antipolo after SWITCH.
- **Camera:** SWITCH frames the whole ride, as it does today (`useSwitchOverview` in `use-card-camera.ts`). It does not glide in to the kept hintuan.
- **The studio** gets the same behaviour: its trip card uses the same hook.

**Done when:** unit tests cover the three cases and an end; the trip card's story shows it; visitor-test gains a step: pick a hintuan, SWITCH, and the Distance and fare tiles read the shorter ride.

## 3. The card and its timeline take their Figma names

**The ask (2026-10-15):** the owner renamed two Figma components. The code takes the same names, as its card components follow the owner's Figma names.

| Figma | Code today | Code after |
| --- | --- | --- |
| TimelineRouteDetailCard (3778:3183) | `RouteTripDetail`, `route-trip-detail.tsx` | `TimelineRouteDetailCard`, `timeline-route-detail-card.tsx` |
| TimelineRouteDetail (4137:9886) | `TripTimeline`, `trip-timeline.tsx` | `TimelineRouteDetail`, `timeline-route-detail.tsx` |

**Where:**

- `git mv` each component, its stories file and `tests/unit/trip-timeline-test.mjs` (→ `timeline-route-detail-test.mjs`).
- The names where they're used: `trip-card.tsx` uses the card, and the card uses the timeline.
- The story titles: `Features/Routes/RouteTripDetail` → `Features/Routes/TimelineRouteDetailCard`, and `Features/Routes/TripTimeline` → `Features/Routes/TimelineRouteDetail`.
- Comments naming them: `livery-card.ts`, `route-end-point-bar.tsx`, `end-titles.tsx`, `hintuan-label.tsx`, `src/features/routes/model/departures.ts`, `src/design-system/foundation/tokens.css`, `fonts.css`, `fonts/README.md`, `tests/e2e/phone-test.mjs`.
- `TripCard` keeps its name: it's the glossary's Trip, the card a direction opens as, and it wraps both.
- Left as they are: the dated write-ups in `docs/`.

**Done when:** typecheck, lint, unit tests and `npm run build` pass; Storybook lists both under their new names.

## 4. Trains say their bound, not Papunta and Pabalik

**The ask (2026-10-15):** on the LRT and MRT, SWITCH reads the direction's **bound**, as riders and the operators say it. Jeeps keep Papunta and Pabalik.

| Line | Toward | Word |
| --- | --- | --- |
| MRT-3 | North Avenue | Northbound |
| MRT-3 | Taft Avenue | Southbound |
| LRT-1 | Fernando Poe Jr. | Northbound |
| LRT-1 | Dr. Santos | Southbound |
| LRT-2 | Antipolo | Eastbound |
| LRT-2 | Recto | Westbound |

**LRT-2 runs east–west**, so its words are Eastbound and Westbound, as LRTA says them (the owner confirmed, 2026-10-15).

**Where:**

- `wayWord` (`src/features/routes/cards/route-card-header.tsx`) takes the direction (its line, and the end it goes to) instead of only whether it's the way back.
- The words come from a table by line and end, beside `src/features/routes/model/rail-codes.ts`.
- Every place that shows the word: the trip card and the route list (`route-card-header.tsx`), the counter's SWITCH on a hintuan's card (`hintuan-card.tsx`), and the studio's signboard editor (`src/features/studio/panels/signboard-editor.tsx`).
- **A list with jeeps and trains together** keeps Papunta and Pabalik, since one word has to fit every route in it. That's a place where a station shares its informal name with jeep hintuans.
- **The ferry** keeps Papunta and Pabalik.

**Words (for `CONTEXT.md`):** the Outbound / Return entry gains: on a train line, a direction is called by its bound, Northbound or Southbound on LRT-1 and MRT-3, Eastbound or Westbound on LRT-2.

**Done when:** a unit test covers the table; the stories show a train's trip card both ways; the headless steps that tap SWITCH by name on a train use the new words (the button's accessible name is its word).

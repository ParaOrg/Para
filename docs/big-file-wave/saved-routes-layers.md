# `src/features/routes/map/saved-routes-layers.ts` — the plan

442 lines on 2026-10-13 (staging `6e718da`). The saved directions on the
map: one source, eight layers (five, and a resting one for each train line
since 2026-10-13), the lighting every lit layer shares, and the hook that
lays the source out and patches full lines in. Split from
`useSavedRoutes.ts` in Stage 10 (header, 18–22); this is the second cut.

## 1. What the file does today

| lines | what |
| --- | --- |
| 1–16 | Imports: MapLibre types, React, the map colours, `useLayerSwitch`/`LayerSwitch`, `layers.ts`'s helpers, `line-style.ts`, `ROUTES_HIT_LAYER`, the direction model. |
| 24–34 | Ids: `SRC` (`saved-routes`), `CASING` (`LAYERS.routesCasing`), `ROUTES_LINE` (exported: `use-saved-routes.ts:9`, framing-test 27, phone-speed-test 34), `SELECTED_CASING`, `SELECTED` (`LAYERS.routesLit`), `LIT_LAYERS`, `HIT` (`ROUTES_HIT_LAYER`). |
| 36–78 | `RAIL_AT_REST` (a resting layer a train line, its pale), `RestingLayer`, `RESTING_LAYERS` (exported: `use-saved-routes.ts:287` queries them), `restsOn`, `RESTING_FILTER`. |
| 80–103 | The two looks and why what is lit is feature state, not a filter; `isLit`. |
| 105–111 | `litOpacity()`, exported: `geo/pass-stretches.ts:14`, gl-programs-test 35. |
| 113–141 | `useLighting(map, source, lit, ready, switched)`, exported: `pass-stretches.ts:139` and this file's hook. |
| 143–154 | `useLitLineColour(map, colour)`, exported: `cards/use-card-stack.ts:11,102`. |
| 156–179 | `routesData(rows)`, exported: map-sources-test. |
| 181–198 | `unpatched(sent, lines)`, exported: map-sources-test. |
| 200–314 | `addSavedRoutes(map, rows)`, exported: `before` (213), the source (216–220), `CASING`, `LINE`, the three rail rests, `SELECTED_CASING`, `SELECTED`, `HIT`. |
| 316–343 | `routesDrawn(map)`, exported: `map-view.tsx:26,293` and framing-test 27. |
| 345–442 | `useSavedRoutesLayers(map, rows, lines, hiddenDirectionId, lit)`: added once with the rows in (368–374), laid out once per list (380–388), full lines patched in once and again at `style.load` (404–421), the studio's hidden direction (427–436), the lit switch and the lighting (440–441). |

Importers: `use-saved-routes.ts:9`, `map-view.tsx:26`, `geo/pass-stretches.ts:14`,
`cards/use-card-stack.ts:11`; `tests/unit/map-sources-test.mjs:21-25` and
`:576` (which imports the hook itself), `gl-programs-test.mjs:28,35,96`,
`layer-switch-test.mjs:11`, `framing-test.mjs:27`, `phone-speed-test.mjs:34`;
`tests/e2e/lib/looks.mjs:15` names the file in a comment.

## 2. The split

| new file | takes | public surface |
| --- | --- | --- |
| `map/lighting.ts` | 80–154 | `litOpacity()`, `useLighting(map, source, lit, ready = true, switched?)`, `useLitLineColour(map, colour)`; `isLit` private. `useLitLineColour` reads `LAYERS.routesLit` from `layers.ts`, so the file needs nothing of the layer file. |
| `map/saved-routes-data.ts` | 156–198 | `routesData(rows)`, `unpatched(sent, lines)`. Pure: the source's features and the patch list. |
| `map/use-saved-routes-layers.ts` | 345–442 | `useSavedRoutesLayers(map, rows, lines, hiddenDirectionId, lit): void`, as today. Imports the ids, `RESTING_LAYERS`, `RESTING_FILTER`, `LIT_LAYERS` and `addSavedRoutes` from the layers file (the private ids become exports), the data functions from the data file, the lighting from `lighting.ts`. |
| `map/saved-routes-layers.ts` keeps | the rest | the ids, `RAIL_AT_REST`, `RESTING_LAYERS`, `RESTING_FILTER`, `addSavedRoutes`, `routesDrawn`. About 225 lines. |

Why these seams:

- `useLighting` and `litOpacity` are the one rule every lit layer shares:
  the routes', the orange stretches' (`pass-stretches.ts`), and by its
  wording the hotspots' (`saved-hotspots-layers.ts:301` points here). Two
  files outside this one import them to light a source of their own; they
  should not have to import the routes' layers to do it.
- The hook mirrors the hotspots' cut, and map-sources-test already imports
  it on its own (576) for the "style made afresh" check.
- `routesDrawn` stays: it is the routes' own "are we drawn" question, it
  reads `SRC` and `LINE`, and `map-view.tsx` and framing-test import it from
  here.

## 3. What must not change

- Source id `saved-routes`; layer ids `saved-routes-casing`, `saved-routes-line`,
  `saved-routes-rail-lrt-1`, `-lrt-2`, `-mrt-3`, `saved-routes-selected-casing`,
  `saved-routes-selected`, `saved-routes-hit`. Nine suites and the cheap-phone
  timer (`phoneSpeedParts.mjs:267-273`) read them.
- The add order (casing, line, the three rails, selected casing, selected,
  hit, all before the first symbol): map-sources-test 226 puts `ride-rest-line`
  right after `saved-routes-selected` and checks the whole order from two
  sequences; the chevrons go under `saved-routes-hit`.
- `promoteId: 'id'` (218); `line-layer-opacity: 0` with 0 ms transitions on
  the two lit layers (274–275, 294–295; layer-switch-test 104);
  `line-color-transition` 0 on `SELECTED` (291); `SELECTED`'s paint reads
  `litWidth()` and `litOpacity()` in this file's text:
  gl-programs-test 96–104 matches `id: SELECTED,[\s\S]*?paint: \{([\s\S]*?)\n\s*\},\n\s*\},\n\s*before,`
  against `saved-routes-layers.ts` and then `'line-width': litWidth(),` and
  `'line-opacity': litOpacity(),` inside it. The layer stays here, laid out
  as Prettier lays it today.
- `routesDrawn`'s four steps in that order (337–342; comment 316–332 says
  why `isSourceLoaded` must come after `getSource`): framing-test 348 and
  the timer's `routesOnMap`.
- The hook's effect order: add once (368); lay out once (380); patch and
  `style.load` (404); hidden filter (427); `useLayerSwitch` then `useLighting`
  (440–441). Stage 10 moved the routes' fit after these on purpose
  (`cb99ecc`); the order inside stays. `patched.current = new Map()` at
  three places (372, 385, 413) is what the "afresh" check (map-sources-test
  550) counts.
- `useLighting` never removes feature state and calls `switched.set` in the
  effect that set the state (139): one frame for both (layer-switch-test 49).
- The stable references the deps rely on: `lit` is `use-saved-routes.ts`'s
  steady array (217–220 there; shown-test 146 "the same things in the same
  order keep the array"), `LIT_LAYERS` is a module constant, `laidOut`,
  `patched`, `hiddenNow` are refs. `useLighting`'s deps
  `[map, source, lit, ready, switched]` must stay as they are.
- Budgets: scale-test (5,000 directions: the first line within 5 s, 'load'
  within 7 s, a tap's full line and stretches within 5 s, main thread under
  5 s), studio-scale-test; map-sources-test's (c) and (e) (laid out once,
  each line patched once); gl-programs-test 145 (a train's rest by the
  resting line's program) and 177 (the ride's rest by it); phone-test's "a
  first tap compiling no GL program".

## 4. Risks and the nets

| risk | net |
| --- | --- |
| The gl-programs regex no longer matches after a reflow | gl-programs-test 92 fails at once; keep `SELECTED`'s `addLayer` call as it is, in this file. |
| An importer of the lighting left pointing here | `npm run typecheck`; `pass-stretches.ts:14` and `use-card-stack.ts:11` rewritten name by name; gl-programs-test 35 follows. The comments at `layer-switch.ts:16`, `saved-hotspots-layers.ts:301`, `framing.ts:200` and `tests/e2e/lib/looks.mjs:15` name the file: update them in the same commit. |
| The hook's deps or refs altered | map-sources-test 550 renders the hook in real React against a stand-in map and counts every `updateData`; the public suites' lit lines (looks.mjs reads `saved-routes-line` and `saved-routes-selected`); group-test and studio-scale-test for the studio's hidden direction. |
| Two PRs on the same test import blocks | The hotspots' PR edits the lines next to these in map-sources-test, gl-programs-test and layer-switch-test. Land one before the other. |
| `map-view.tsx`'s import of `routesDrawn` | Unchanged; the map-view PR does not touch this file. |

Nothing new becomes pure: `routesData` and `unpatched` already have their
tests (map-sources-test 361, 460, 484). No new unit test; the count stays.

## 5. Step order

One pull request, three commits:

1. `lighting.ts`: the three exports out; `pass-stretches.ts`, `use-card-stack.ts`
   and gl-programs-test follow; the four comments renamed. Typecheck, lint,
   unit (gl-programs-test's regex is the first thing to watch), build.
2. `saved-routes-data.ts`; `map-sources-test.mjs:21-25` follows.
3. `use-saved-routes-layers.ts`: the hook out, the ids exported;
   `use-saved-routes.ts:9` and `map-sources-test.mjs:576` follow.

Then every public suite and the studio's group-test and studio-scale-test
(a PR under `src/features/routes/` runs both CI jobs).

## 6. Model advice

Opus 5.5, with the unit tests run after each commit: three of them read this
file by import path or by text, and they are the fast net. The hook's "afresh"
check in real React is the delicate part, and it already exists.

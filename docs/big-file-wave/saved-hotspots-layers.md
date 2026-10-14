# `src/features/routes/map/saved-hotspots-layers.ts` — the plan

457 lines on 2026-10-13 (staging `6e718da`). The saved hotspots on the map:
two sources, eight layers, the hatch pattern, the filters the studio sets,
and the hook that keeps them in step with what is loaded and what a tap
marked. Split from `useSavedStops.ts` in Stage 10 (header, 16–20); this is
the second cut.

## 1. What the file does today

| lines | what |
| --- | --- |
| 1–14 | Imports: MapLibre types, React, the map colours and opacities, `LngLat`, the hotspot colours, `BoxMark`, `useLayerSwitch`, `layers.ts`'s helpers, `HOTSPOTS_FILL_LAYER`, `ringToPolygon`/`Ring`, `hotspotRing`/types, `labelGroups`. |
| 22–35 | Ids: `SRC` (`saved-stops`), `FILL` (`LAYERS.hotspotsFill`), `OUTLINE`, `LABEL`, `HINTUAN_LABEL` (`LAYERS.hotspotsHintuanLabel`); `NAMES_FROM`. |
| 37–51 | `state()`, a feature-state flag; `labelsOf(kind, hidden)`, a label layer's filter. |
| 52–68 | `namePaint(kind)`, exported: one colour a layer (the cheap-phone plan, step 4). |
| 69–71 | `HATCH`, `HATCH_LAYERS`. |
| 73–88 | `boxState(mark)`, exported: a `BoxMark` as feature state. |
| 89–112 | `hatchOf(kind)`, `hatch(hex)`: the Selected stripes as a 32×32 RGBA pattern. |
| 114–119 | `HINTUAN_STRONGER`. |
| 121–126 | `boxMiddle(ring)`. |
| 127–144 | `SIBLINGS`, `SIBLING_LAYERS`, `WASH_SRC` (`place-wash`), `WASH`, `WASH_EDGE`; `ROUTES_ABOVE`, `DRAW_ABOVE`. |
| 146–168 | `hiddenHotspotFilters(hidden)`, exported: the six filters, one for every layer of the source, kept to one bucket (step 5). |
| 170–204 | `hotspotsData(hotspots)`, exported: the boxes and one label per place. |
| 206–371 | `addSavedHotspots(map, hotspots)`, exported: the `before` layer (221–225), the two sources (229–237), wash and wash edge (239–262), the by-kind expressions and the two hatch images (265–272), `FILL` (273–285), `OUTLINE` (286–297), `SIBLINGS` (302–317), `HATCH` (322–342), the two label layers, hintuans' under terminals' (346–370). |
| 373–457 | `useSavedHotspotsLayers(map, hotspots, hiddenHotspotId, marks, hull)`: added once with what is loaded (390–396), laid out once per list (398–402), the marks as feature state with the two switches (404–432), the wash (434–445), the studio's hidden box (447–456). |

Importers: `use-saved-hotspots.ts:10` (`useSavedHotspotsLayers`);
`tests/unit/map-sources-test.mjs:26-30` (`addSavedHotspots`,
`hiddenHotspotFilters`, `hotspotsData`), `gl-programs-test.mjs:29-33`
(`addSavedHotspots`, `hiddenHotspotFilters`, `namePaint`),
`layer-switch-test.mjs:12` (`addSavedHotspots`, `boxState`),
`map-style-test.mjs:16` (`hiddenHotspotFilters`).

## 2. The split

The seam Stage 10 drew for the routes' hook was data, layers, taps, what
shows. Here the hook and its layers still share a file. The cut: the layers
and their ids stay (that is what the unit checks read), the hook goes beside
them, and the two pure helpers that have nothing to do with MapLibre go to
their own files.

| new file | takes | public surface |
| --- | --- | --- |
| `map/use-saved-hotspots-layers.ts` | 373–457 | `useSavedHotspotsLayers(map, hotspots, hiddenHotspotId, marks, hull): void`, as today. It imports `SRC`, `FILL`, `SIBLINGS`, `WASH_SRC`, `SIBLING_LAYERS`, `HATCH_LAYERS`, `addSavedHotspots`, `hiddenHotspotFilters` from the layers file and `hotspotsData` from the data file, so those ids become exports (`drawLayers.ts` did the same for `useDrawing` in Stage 10). |
| `map/hotspot-hatch.ts` | 89–112 | `hatchOf(kind): string`, `hatch(hex): { width; height; data: Uint8Array }`. Pure: a bitmap from a hex colour. |
| `map/saved-hotspots-data.ts` | 121–126, 170–204 | `hotspotsData(hotspots)`, `boxMiddle(ring): LngLat`. Pure: the source's features from the rows. |
| `map/hotspots-shown.ts` gains | 73–88 | `boxState(mark: BoxMark \| undefined)`. It already owns `BoxMark`, `boxMarks` and `placeHull` ("what a tap marks"); the mark's feature state belongs with the mark. |
| `map/saved-hotspots-layers.ts` keeps | the rest | ids (exported now), `NAMES_FROM`, `state`, `labelsOf`, `namePaint`, `HINTUAN_STRONGER`, `hiddenHotspotFilters`, `addSavedHotspots`. About 290 lines. |

Why: `addSavedHotspots` and `hiddenHotspotFilters` are what four unit tests
import, and they read the ids; keeping ids and layers together keeps those
tests' imports as they are. The hook is React and effect order; the hatch and
the data are arithmetic.

## 3. What must not change

- Source ids `saved-stops`, `place-wash`; layer ids `saved-stops-fill`,
  `saved-stops-outline`, `saved-stops-siblings`, `saved-stops-hatch`,
  `saved-stops-label`, `saved-stops-label-hintuan`, `place-wash-fill`,
  `place-wash-edge`; image ids `hotspot-hatch-terminal`, `hotspot-hatch-hintuan`.
  visitor-test reads five of them, phone-test and group-test `saved-stops-fill`,
  scale-test and studio-scale-test `saved-stops`.
- The add order (wash, wash edge, fill, outline, siblings, hatch, hintuan
  labels, terminal labels) and the `before` choice (221–225): under the
  routes' casing, else the draft's, else the first symbol. map-sources-test's
  "the rest of a ride … whichever hook adds first" (226) compares the whole
  order from two add sequences.
- One fill bucket: `FILL`, `SIBLINGS` and `HATCH` share type, source, filter
  and layout as added (278, 307, 327: the same polygon filter, no layout), and
  `hiddenHotspotFilters` gives the three the same `boxes` filter (159–164).
  map-sources-test 279 and map-style-test 96 hold it; the cheap-phone plan's
  step 5.
- `promoteId: 'id'` (231); `fill-layer-opacity: 0` with a 0 ms transition on
  `SIBLINGS` and `HATCH` (312–313, 337–338; layer-switch-test 104); the labels'
  `minzoom: NAMES_FROM`, `text-font`, and one colour a layer through
  `namePaint` (gl-programs-test 637: the basemap's names' program).
- The hook's effect order: add once; lay out once; the two `useLayerSwitch`
  effects (413–414); the marks' feature state with `siblingSwitch.set` and
  `hatchSwitch.set` in the same effect (415–432: one frame for both); the
  wash; the hidden filter. Never `removeFeatureState` (comment 406–408).
- The refs `laidOut` (390), `was` (412), `hiddenNow` (450) and the constant
  arrays `SIBLING_LAYERS`, `HATCH_LAYERS` handed to `useLayerSwitch`: the
  switch is made once per hook (`kept.current ??=`), and its twins are warmed
  once per map. `applyHidden` sets no filter on the public map
  (map-style-test 64: 13–18 ms a load, and the bucket split, saved).
- `hotspotsData`'s features word for word: map-sources-test 361 compares the
  committed map's layout with its own copy of the old code, `boxMiddle`
  included.
- Budgets: scale-test (510 hotspots; 'load' within 7 s, main thread under
  5 s), studio-scale-test (10 s and 15 s), phone-test's "a trip's tap
  compiling no GL program" (the siblings' and the stripes' programs are their
  twins', warmed while idle).

## 4. Risks and the nets

| risk | net |
| --- | --- |
| An id made private again, or renamed in the export | `npm run typecheck`; map-sources-test (12), gl-programs-test (15), layer-switch-test (9), map-style-test (8). |
| The effect order changed in the move | map-sources-test's hook-free checks do not see order; visitor-test (a hotspot's HintuanCard, its box Selected, the wash, the hotspot dark under a trip), phone-test and group-test do; hotspot-test and save-test for the studio's hidden box. |
| The hatch bitmap | New `tests/unit/hotspot-hatch-test.mjs`: 32×32×4 bytes; RGB from the hex; alpha 255 on the diagonals `x + y + 1 ≡ 0 (mod 32)` and 0 a few pixels away; the pattern's period 32 so it tiles; `hatchOf` the two ids. No suite reads the pixels today. |
| The data file | map-sources-test's "laid out as before" (361) and "added with what is loaded" (376) already compare every feature; the import paths at 26–30 follow. |
| `boxState` moved | layer-switch-test 165 ("a box's feature state for its mark is what the effect set before"): import path follows. |
| Two PRs editing the same test import blocks | saved-routes-layers' PR edits `map-sources-test.mjs:21-25`, `gl-programs-test.mjs:28,35` and `layer-switch-test.mjs:11` too. Land one before starting the other (README-public). |

## 5. Step order

One pull request, four commits:

1. `use-saved-hotspots-layers.ts`: the hook out; the ids it needs exported;
   `use-saved-hotspots.ts:10` imports it from there. Typecheck, lint, unit,
   build.
2. `hotspot-hatch.ts` with `hotspot-hatch-test.mjs`.
3. `boxState` to `hotspots-shown.ts`; `layer-switch-test.mjs:12` follows.
4. `saved-hotspots-data.ts`; `map-sources-test.mjs:26-30` follows. Update
   the comment at 301 ("see useLighting in savedRoutesLayers.ts") if the
   routes' PR has landed first (it names the file lighting moves to).

Then the public suites and the studio's hotspot-test and save-test (a PR
under `src/features/routes/` runs both CI jobs).

## 6. Model advice

Straightforward: Opus 5.5. The hook moves whole, the two pure files have no
callers but the hook and the tests, and the one-bucket invariant is held by
two unit tests that run in seconds.

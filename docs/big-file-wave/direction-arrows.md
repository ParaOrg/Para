# `src/features/routes/map/direction-arrows.ts` — the plan

440 lines on 2026-10-13 (staging `6e718da`). The chevrons that flow along
the lit lines, the places each lit ride runs from and to, and the colours the
lit line's chevrons and rest wear. Stage 10 took the geometry out to
`chevrons.ts` (pure, `60cdd36`); what is left is one flow effect, two types
that other files read, and two small hooks.

## 1. What the file does today

| lines | what |
| --- | --- |
| 1–22 | Imports: MapLibre types, React, the map colours, `haversine`/`metresPerPixel`, `chevrons.ts`, `TILE_BUFFER`/`useLayerReady`, `litWidthAt`, `LineLook`, `REST_LAYER`/`restDrawn`, `ROUTES_HIT_LAYER`. |
| 24–58 | The chevrons' design record: inside the line, on what is lit, flowing, white, a polygon drawn each frame. |
| 60–63 | Ids: `SRC` (`direction-arrows`), `CHEVRONS` (`direction-arrow-chevrons`); `SAME_END_M`. |
| 65–106 | `Ride` (a lit ride: its line, `flow`, `rest`, its ends and their hotspots, `routeCode`), `RideEnd`. |
| 108–143 | `rideEnds(rides)`, exported: each place named once, `rides` gathered on the named end, `paled` where the rest is drawn. Read by `end-titles.tsx:7`. |
| 145–178 | The flow's pacing: `STEP_MS` (15 a second), `SLOW_STEP_MS`, `SLOW_FOR_MS`, `WARM_MS`, `AWAY_MS`, with the runner measurements behind each. |
| 180–184 | `stillPlease()`: prefers-reduced-motion. |
| 186–209 | `useRideColours(map, look)`, exported: paints the chevrons and the ride's rest from the look, each once its layer is there. Read by `cards/use-card-stack.ts:9,103`. |
| 211–235 | `addDirectionArrows(map)`, exported: the source with `TILE_BUFFER`, the fill layer under `ROUTES_HIT_LAYER`. Read by map-sources-test 35. |
| 237–247 | `viewOf(map)`. |
| 249–260 | `widened(view)`, exported (chevrons-test 18). |
| 262–286 | `onAMove(held, drawnAt, now)`, exported (chevrons-test 18). |
| 288–440 | `useDirectionArrows(map, rides)`: the `lines` memo (296), the add once the hit layer is there (297–306), and the flow effect (308–439): measure (312–322), the closure's locals (323–336), `draw(wide)` (338–353), `onMove` (359–362), `onStart` with the settle frame (373–379), `onEnd` with the zoom bookkeeping (380–405), `tick` with the pacing (406–424), start and cleanup (425–438). |

Importers: `use-lit-rides.ts:6` (`useDirectionArrows`, `Ride`),
`end-titles.tsx:7` (`rideEnds`, `Ride`), `cards/use-card-stack.ts:9`
(`useRideColours`); `tests/unit/chevrons-test.mjs:18,326` (`onAMove`,
`widened`, `useDirectionArrows`), `map-sources-test.mjs:35`
(`addDirectionArrows`).

## 2. The split

Two moves in one PR, and one extraction in a second PR of its own.

| new file | takes | public surface |
| --- | --- | --- |
| `map/ride-ends.ts` | 62–143 | `Ride`, `RideEnd`, `rideEnds(rides): RideEnd[]`; `SAME_END_M` private. Pure (it reads `haversine` and `restDrawn`). `end-titles.tsx` and `use-lit-rides.ts` import from here; `direction-arrows.ts` imports `Ride`. |
| `map/use-ride-colours.ts` | 186–209 | `useRideColours(map, look: LineLook): void`. It paints another file's layer (`ride-rest.ts`) and this one's; it belongs to neither more than the other, and `use-card-stack.ts` is its only caller. |
| `map/direction-arrows.ts` keeps | the rest | the ids, `stillPlease`, `addDirectionArrows`, `viewOf`, `widened`, `onAMove`, `useDirectionArrows`. About 335 lines, 35 of them the design record. |

The second PR, if the owner wants the flow's pacing testable:

| new file | takes | public surface |
| --- | --- | --- |
| `map/chevron-flow.ts` | 145–178 and the arithmetic of 390–404 and 406–424 | `STEP_MS` and the four pacing constants; `interface Pace { last; warmUntil; slow }`; `paceStep(pace, now): { do: 'wait' } \| { do: 'rest' } \| { do: 'step'; by: number; pace: Pace }` (lines 407–423 without `moving` and the frame requests: too soon → wait; a gap past `AWAY_MS` restarts the warm-up; slow steps summed outside the warm-up; `SLOW_FOR_MS` of them → rest; else step on by at most two steps); `paceAfterMove(pace, { restedAt, zoomAt, zoom, now }): { pace; restedAt; zoomAt; resume: boolean }` (lines 389–404: a zoom of a level or more restarts the warm-up, and wakes a rested flow). |

This is not a pure move: the closure's `last`, `slow`, `warmUntil`, `restedAt`
and `zoomAt` become a record passed in and out, and `tick` and `onEnd` call
the two functions where the arithmetic was. The behaviour must be the same
to the millisecond. There is no unit test for it today: `6b5f5f0` and
`419137c` tuned these numbers against visitor-test and a GitHub runner. The
gain is the test that would have caught either tuning going wrong.

## 3. What must not change

- Ids `direction-arrows`, `direction-arrow-chevrons` (visitor-test 1229,
  1257, 1290; group-test; looks.mjs); `buffer: TILE_BUFFER` on the source
  (map-sources-test 146: the one source at 32 px); the layer placed before
  `ROUTES_HIT_LAYER` (map-sources-test 226); `fill-color-transition` 0.
- `useLayerReady(map, ROUTES_HIT_LAYER)` gating the add (297–306); the
  `lines` memo on `[rides]` and the effect's deps `[map, lines, hitReady]`:
  "Pass the same array while what is lit is unchanged (a memo), or the flow
  restarts" (291–293). The array comes from `use-lit-rides.ts:52-62`'s memo
  over `use-saved-routes.ts`'s steady `litDirections`; nothing here may make
  a new array per render.
- The measure cache: `measure(l)` is memoised per line in `chevrons.ts`
  (chevrons-test 128, 158), `markCovered` fresh each effect run.
- The hold rule: drawn once for the view, wide on `movestart`, nothing while
  inside what is held, back to the view a frame after `moveend`, a draw
  dropped if a move starts first (373–388; chevrons-test 194–290 and its last
  test, which runs the hook with a fake `requestAnimationFrame` and counts
  every `setData`). Those counts are exact.
- The flow: fifteen steps a second (visitor-test 1305: 8 to 18 redraws in a
  second, and the chevrons moved); still under prefers-reduced-motion
  (`still`, 323, 349, 431); `cancelAnimationFrame` of both frames in cleanup
  (433–434).
- `rideEnds`'s rules, word for word: `named` only for the first end of a
  name within `SAME_END_M`; `rides` pushed onto the named end of the same
  side only (`same.end === end`, 128); `of` the ride's id; `paled` only on
  `'to'` with a rest `restDrawn` (137). end-titles and visitor-test's end
  circles and pills read them; a change shows as a missing pill.
- `useRideColours` waits on `CHEVRONS` and on `REST_LAYER` separately
  (197, 204), each painted as its layer arrives; visitor-test 911 ("its
  chevrons in the card's words' colour") and the rest in the card's pale.
- Budgets: the per-frame cost of a pan (the cheap-phone plan's step 17:
  nothing drawn while held; chevrons-test 290), the compass camera's eases
  costing no draw (comment 363–372; where-test), scale-test's main thread
  under 5 s.

## 4. Risks and the nets

| risk | net |
| --- | --- |
| `Ride`'s importers | `npm run typecheck`; `end-titles.tsx`, `use-lit-rides.ts` rewritten name by name. |
| `rideEnds` | New `tests/unit/ride-ends-test.mjs`: two rides ending at one name within 150 m → one named end carrying both ids, the other bare; the same name 200 m apart → two named; an unnamed end never named; `paled` true only for a `to` end with a rest of two points or more; a ride with one point dropped; `of` null without an id. Then visitor-test's end circles and pills (10 reads of `end-title`). |
| `useRideColours` | visitor-test 911 and the pale rest (the 2026-10-12 and 10-13 checks); no unit test reads it. |
| The pacer (second PR) | New `tests/unit/chevron-flow-test.mjs`: wait under 66 ms; a step of 66–133 ms flows by the gap; a leap capped at two steps; a gap over 2 s restarts the warm-up and counts as no slow step; late steps summed only after the warm-up, resting at 2 s of them; a zoom of a level restarts the warm-up, a pan does not; a rested flow resumes at a zoom of a level. Then chevrons-test's hook test (the fake frames run at time 0, so the pacing never fires there: it proves only that the hold rule survived) and visitor-test 1251–1307 in the browser. |
| The lint pass tonight | Rebase on their merge first. |

## 5. Step order

PR 1, two commits:

1. `ride-ends.ts` with `ride-ends-test.mjs`; `end-titles.tsx`,
   `use-lit-rides.ts` and `direction-arrows.ts` import from it.
2. `use-ride-colours.ts`; `use-card-stack.ts:9` follows.

PR 2, one commit, after PR 1 and only with the owner's yes: `chevron-flow.ts`
with its tests, `tick` and `onEnd` rewritten to call it, every number read
back against lines 389–424.

Both run the public suites and group-test; `use-card-stack.ts` is also
touched by the saved-routes-layers PR (its line 11), so sequence the two
(README-public).

## 6. Model advice

PR 1 is straightforward: Opus 5.5. PR 2 is delicate: Fable 5.1, with
visitor-test's flow checks run locally before and after, and a reviewer
reading the old closure and the new record side by side. If the owner would
rather not, the file stays at about 335 lines and the pacing stays as the
runner tuned it.

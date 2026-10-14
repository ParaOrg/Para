# `src/features/routes/map/map-view.tsx` — the plan

464 lines on 2026-10-13 (staging `6e718da`). The one MapLibre owner: it makes
the map, hands it out at the right moment, and says what went wrong when it
does not come. It is long for two reasons: one effect (204–406) holds the
map's whole life in one closure, and half the file is the record of why each
line is there. Six unit tests read this file's text by regular expression, so
the split is bounded by what they pin.

## 1. What the file does today

| lines | what |
| --- | --- |
| 1–10 | Imports: MapLibre's controls, `prewarm`, `setWorkerUrl`; the worker's URL through `?worker&url`; React; `noop`; the basemap, the control, `diagnose`, `framing.ts`, `routesDrawn`, `noteTile`. |
| 29–60 | The worker, started as the module is read: `setWorkerUrl(maplibreWorkerUrl)` (40) then `prewarm()` (60). Module side effects, the cheap-phone plan's steps 6 and 14. |
| 62–73 | `STYLE_URL`, read by `published-map/pwa.ts:4` for the offline cache warm-up. |
| 75–82 | `APP_MOVE`, the event data of a camera move the app makes: `studio-app.tsx:12`, `cards/use-overviews.ts:9`, `use-saved-hotspots.ts:9`, `ride-to.ts:6`. |
| 84–95 | `ATTRIBUTION`, the four credits. |
| 97–104 | `coarse`, a finger: `locator/visitor-location.tsx:3`, the studio's `sign-in.tsx:3`, `reset-password.tsx:3`, `change-password.tsx:3`, `hotspot-panel.tsx:5`. |
| 106–116 | `CENTER`, `ZOOM`, `LOAD_TIMEOUT_MS`. |
| 118–163 | `Props`: `onReady`, `zoomButtons`, `maxBounds`, `foldCredits`, `openOn`, each with its history. |
| 165–173 | `METRO_MANILA`, the public map's `maxBounds` (`public-map-app.tsx:29`). |
| 175–202 | `MapView`'s state: `error`, the 'load' flag, `lifted`, `diag`, `trace`, `dom`, `eventsRef`, `basemap`, `ready`. |
| 204–406 | The one effect: StrictMode's deferral (207–219); the style and the framing awaited together (219–228); `new MapLibreMap({…})` (230–263); `__mapEarly` (265–272); `openedOn` and the `style.load` handover (274–285); `loadingLifts` (287–293); the lifecycle trace (295–318); the controls (320–331); 'load' with `__map`, `__programs`, `setReady` and the studio's `onReady` (333–357); 'error' (359–371); `loadClock` and the DOM description on a timeout (373–394); cleanup (397–404). |
| 408–463 | Render: the wrapper and the container (421–423), `BasemapControl` (425–431), "Loading map…" (433–437), the failure banner with its diagnosis grid (439–461). |

## 2. The split

What can move is what no test reads by text and what shares no local of the
effect's closure. That is four pieces. The worker start, the map's options,
the handover, the clock and the lift stay (section 3 says which test pins
each). Nothing moves out of the map folder.

| new file | takes | public surface |
| --- | --- | --- |
| `map/map-failure.tsx` | 439–461 | `MapFailure({ message, diagnosis, dom, trace, styleUrl })`, `MapFailureProps`. Presentational: the red banner, the `<dl>` of WebGL, renderer, style fetch, DOM and events, the tile source line. |
| `map/map-controls.ts` | 84–95, 320–331 | `addMapControls(map, { zoomButtons, coarse, foldCredits })`: Navigation (a mouse only), Scale, Attribution top right on touch, and MapLibre's own fold. `ATTRIBUTION` stays private to it. `coarse` is passed in, so the file does not import `map-view.tsx` back. |
| `map/map-trace.ts` | 297–318, 381–390 | `LIFECYCLE` (the eleven events), `traceLifecycle(map: Pick<MapLibreMap, 'on'>, stamps: string[]): void` (each event stamped once with its ms from the call), `describeDom(container: HTMLElement \| null): string` (the three answers of 384–389). Pure but for `performance.now()`. |
| `map/expose-map.ts` | 265–272, 338–353 | `exposeMapEarly(map)`, `exposeMap(map)`: the dev and `VITE_EXPOSE_MAP` handouts of `window.__mapEarly`, `window.__map`, `window.__programs`, with the comments that say who reads them. The `import.meta.env` guard moves with them. |
| `map/map-view.tsx` keeps | the rest | `STYLE_URL`, `APP_MOVE`, `coarse`, `METRO_MANILA`, `MapView`. About 365 lines; the component about 175, mostly the effect and its comments. |

Why these and not more:

- `coarse` and `APP_MOVE` have nine importers between them, four in the
  studio's files that the studio sessions are splitting tonight. Moving them
  (to `tap.ts`, beside `coarsePointer`, and to `framing.ts`, which already
  describes app moves) is sound but is importer churn for no line count; a
  later, separate change if the owner wants it.
- The effect's remaining pieces share `map`, `isLoaded`, `stopClock`,
  `stopLift` and seven setters. Turning it into a `useMapInstance` hook that
  returns them is a rewrite of the closure, not a move. Not this wave.
- The worker start, the map's options and the lift lines are pinned by text
  (below). Moving them means rewriting five tests to read a new file; the
  gain is forty lines.

## 3. What must not change

**Text the unit tests read in `map-view.tsx`.** These lines stay in this
file, as written:

| test | what it matches |
| --- | --- |
| `early-start-test.mjs:17-29` | `setWorkerUrl(maplibreWorkerUrl);` and `prewarm();` at column 0, in that order, `prewarm(` once. |
| `maplibre-worker-test.mjs:16-23`, `:115` | `import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'`; the file in no chunk group of `vite.config.ts`. |
| `tiles-asked-test.mjs:81-88` | `import { noteTile } from './tiles-asked'`; `...(openOn ? { transformRequest: noteTile } : {})`; `transformRequest` once. |
| `map-style-test.mjs:21-27` | `new MapLibreMap({ … })` with `validateStyle: false,` inside it. |
| `framing-test.mjs:81-94` | `bounds: framing, fitBoundsOptions: ROUTES_FRAMING`. |
| `framing-test.mjs:269-280` | `stopClock = loadClock(map, !!openOn, LOAD_TIMEOUT_MS, () => {` and a line that is `stopClock();`. |
| `framing-test.mjs:455-480` | `stopLift = loadingLifts(map, openOn ? routesDrawn : null, () => setLifted(true))`; `stopLift();`; the "Loading map…" JSX byte for byte; `map.on('load', () => {` followed by `isLoaded = true;` and `setLoaded(true)`; exactly one `setLifted(`; `setReady(map)` inside the 'load' handler. |
| `loading-screen-test.mjs:78-100` | `<div className="absolute inset-0 bg-surface-secondary">` and the "Loading map…" `<div>`/`<p>` pair. |

The 'load' handler's first two lines and `setReady(map)` are pinned, so
`exposeMap(map)` is called between them, where the inline code is now
(347–353), and the regular expression at `framing-test.mjs:480` (no closing
`})` between `map.on('load'` and `setReady`) still holds.

**Order inside the effect.** `openedOn` and `once('style.load', …)` are
registered before anything can load (comment 274–280), then `loadingLifts`,
then the trace, then the controls, then 'load', 'error' and the clock. A
function call replaces each moved block in its place; nothing is reordered.
Cleanup stays: `cancelled`, the timer, `stopClock()`, `stopLift()`,
`setReady(null)`, `map?.remove()`.

**Ids and handouts.** `window.__mapEarly`, `window.__map`,
`window.__programs` (phone-test 223–282 and every drawing suite; the
cheap-phone timer); `data-testid="basemap"` is `BasemapControl`'s and stays.
`check-build.mjs:234-243` proves no production file hands out `__map`: the
`import.meta.env` guard must move with the code, not be widened.

**Words the suites read.** "Loading map…" (phone-test 270, 754; pwa-test 68;
phone-speed 522) and "The map failed to load" (pwa-test 67, 412).

**The DOM the suites read.** `.maplibregl-ctrl-zoom-in` absent on `/`
(phone-test 475, visitor-test 287), the attribution in `.maplibregl-ctrl-top-right`
on a phone and `-bottom-right` with a mouse (phone-test 479–480, 3950–3954),
`.maplibregl-compact-show` removed when `foldCredits` (save-test 1346–1347).
`addMapControls` adds them in today's order: Navigation, Scale, Attribution,
then the fold.

**Budgets.** scale-test's 'load' within 7 s and the main thread under 5 s;
the cheap-phone timer's stamps (routes drawn, "Loading map…" gone). The
worker is started at module read, so `map-view.tsx` must stay a static import
of both shells (it is: `public-map-app.tsx:29`, `studio-app.tsx:12`), and no
new file may import `map-view.tsx` back (a cycle would reorder the module
side effects).

**Stable references.** `onReadyRef` (183–184); the effect's `[]` deps with
the note at 405. The lint pass may put an `eslint-disable-next-line` there
tonight; take theirs.

## 4. Risks and the nets

| risk | net |
| --- | --- |
| A pinned line reflowed by Prettier or retyped | `npm run test:unit` after every commit: framing-test (18), loading-screen-test (4), early-start-test (3), maplibre-worker-test (4), tiles-asked-test (6), map-style-test (8). |
| The banner's props mis-wired (`basemap.url`, `dom`, `trace`) | pwa-test's "no failure banner" at 'load' and offline (386, 412); no test renders the banner's failure state, so check it once by hand: block the style host and load `/`. |
| Controls in the wrong corner or the fold gone | phone-test 475–480 and 3950–3954, visitor-test 287, save-test 1346–1347. New unit test: `map-controls-test.mjs`, a stand-in map that records `addControl(control, position)`, for coarse and fine × `zoomButtons`, and `foldCredits` removing the class from the container. |
| The trace's stamps or the DOM line | New unit test: `map-trace-test.mjs`, a stand-in `on` firing each event twice (stamped once, `evt@Nms`), and `describeDom` for a missing container, a container without a canvas, and one with (the width × height text). |
| The handouts gated wrongly | `npm run build` (check-build's `__map` check, with its positive control on the studio side); phone-test reads `__mapEarly` on the dev server. |
| The lint pass tonight | This file is the one every session's lint pass is likeliest to touch (the `[]` deps at 406). Rebase after their merge. |

## 5. Step order

One pull request, four commits:

1. `map-failure.tsx`: the banner out; `diag`, `trace`, `dom` and `error`
   passed as props. Typecheck, lint, unit, build.
2. `map-controls.ts` with `map-controls-test.mjs`.
3. `map-trace.ts` with `map-trace-test.mjs`; the timeout's `setDom(describeDom(containerRef.current))`.
4. `expose-map.ts`.

Then the public suites (phone-test for the opening and the handouts,
pwa-test on a production build for the design button and the banner,
scale-test for the budgets) and gate-test for the studio's map. A PR under
`src/features/routes/` runs both CI jobs.

## 6. Model advice

Opus 5.5 for the four moves, with the table in section 3 open beside it: the
risk here is not design but a pinned line changed by a stray reformat, and
the unit tests say so at once. Anything deeper (a hook owning the map's
state, or moving `coarse` and `APP_MOVE` out) is a change of the closure or
of nine importers, and would want Fable 5.1 and the owner's word first.

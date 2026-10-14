# `src/features/locator/use-locator.ts` — the plan

464 lines on 2026-10-13 (staging `6e718da`). "Where am I": the browser's
watch, the phone's compass, the camera on the visitor and the button's rules.
A third of it is already pure and already unit-tested through this file's
path; the rest is one hook with one `useCallback` and three effects.

## 1. What the file does today

| lines | what |
| --- | --- |
| 1–9 | Imports: MapLibre's type, React, `Turn`, `Snap`, `haversine`/`zoomForScale`/`LngLat`, `noop`, `LocatorMode`. |
| 11–35 | The hook's doc: the owner's LocatorButton rules (3870:5408), the four looks. |
| 37–51 | Types: `LocatorStatus`, `Camera`, `Fix`. |
| 53–82 | Constants: `STILL_BELOW_MPS`, `TRACKED_SCALE_M`, `COMPASS_SCALE_M`, `FAR_SCALE_M`, `ACCURACY_MIN_M`, `ACCURACY_MAX_M`, `QUIET_MS`, `COMPASS_PITCH`. |
| 84–141 | Pure rules: `indicatorScale` (92), `modeFor` (105), `afterTap` (112), `trackedZoom` (120), `circleRadius` (125), `bearing` (129), `apart` (139). |
| 143–171 | `motionFrom`: speed and heading from a run of fixes, pure. |
| 173–192 | `Orientation`, `compassHeading`: a phone's orientation event as a heading, pure. |
| 194–227 | `TURN_DEG`, `useCompass(on)`: the `deviceorientation` listener, readings within 3° dropped. |
| 229–236 | `askForCompass`: Safari's permission, inside a tap. |
| 238–278 | `Locator`, what the hook returns (read by `locator.tsx:6`, `locator.stories.tsx:8`, `locator-mood.ts`), and `Options`. |
| 280–310 | `useLocator`'s state and refs: `status`, `fix`, `camera`, `taps`, `noFix`; `watchRef`, `heardRef`, `fixesRef`, `headingRef`, `offsetRef`, `readRef`, `trackedZoomRef`, `cameraRef`; `useCompass` at 299. |
| 312–381 | `tap`: the camera round, the quiet watch replaced (the owner's ask of 2026-10-13, `369920e`), the watch started; its fix handler (337–357) and error handler (358–378). |
| 383–408 | The let-go effect: a gesture or an `APP_MOVE` sets the camera free. |
| 410–444 | The follow effect: `easeTo` on each fix, turn, tap or sheet height, at the page's turn (`cameraTurn`), with the `eslint-disable` at 443 and its reason. |
| 446–451 | The watch cleared on unmount. |
| 453–463 | The return. |

Importers: `visitor-location.tsx:11` (`useLocator`), `locator-mood.ts:3`
(`STILL_BELOW_MPS`, `Camera`, `Fix`), `locator-indicator-overlay.tsx:11`
(`circleRadius`, `indicatorScale`, `Fix`), `locator.tsx:6` and
`locator.stories.tsx:8` (`Locator`); `tests/unit/locator-test.mjs:10-24`
(thirteen names), `tests/unit/commit-turn-test.mjs:20` (`useLocator`).
where-test's header (line 1) names this file for the rules.

## 2. The split

| new file | takes | public surface |
| --- | --- | --- |
| `locator/locator-rules.ts` | 37–192, and two new pure functions | `LocatorStatus`, `Camera`, `Fix`, the eight constants, `indicatorScale`, `modeFor`, `afterTap`, `trackedZoom`, `circleRadius`, `bearing`, `apart`, `motionFrom`, `Orientation`, `compassHeading`; new: `fixFrom`, `visitorCamera` (below). No React, no MapLibre: `locator-test` already treats these as pure. |
| `locator/use-compass.ts` | 194–236 | `useCompass(on: boolean): number \| null`, `askForCompass(): void`. `TURN_DEG` private. The one hook here that owns a window listener and its cleanup. |
| `locator/use-camera-let-go.ts` | 383–408 | `useCameraLetGo(map: MapLibreMap \| null, setCamera: (c: Camera) => void): void`. The five listeners and their `off`s, unchanged; `setCamera` is React's stable setter, so the deps `[map, setCamera]` run the effect once per map, as `[map]` did. |
| `locator/use-locator.ts` keeps | 11–35, 238–463 less the above | `Locator`, `useLocator(map, { offset, snap, compass, cameraTurn })`. About 230 lines, of which the doc is 25 and `Locator`'s field comments 26. |

Two pure extractions make what is left testable, each a move of lines into a
function called from where they were:

- `fixFrom(position, run, lastHeading, now)` → `{ fix: Fix; run }`: lines
  339–353. The 15 s window on the run, `motionFrom`, the browser's speed if
  it gives one, its heading only while moving at `STILL_BELOW_MPS` or more.
  The handler at 337 becomes: note the time, `const { fix, run } = fixFrom(…)`,
  keep `run` and `fix.heading` in the refs, set the three states.
- `visitorCamera({ camera, fix, turn, trackedZoom, mapBearing, tapped })` →
  the `easeTo` options of 426–434 (centre, zoom by `COMPASS_SCALE_M` or the
  kept tracked zoom, pitch `COMPASS_PITCH` or 0, bearing the turn or the
  map's or 0, duration 800 or 400). `offset` is added by the caller from
  `offsetRef.current()`.

The follow effect itself stays in `useLocator`: it is the hook's purpose
("the camera with them"), it shares `trackedZoomRef` with `tap`, and the
`cameraTurn` rule with its `eslint-disable` reads best next to the hook that
takes the option.

## 3. What must not change

- The order of hook calls: `useCompass` (299) before `tap`; then the let-go
  effect, the follow effect, the unmount cleanup, in that order. `useCameraLetGo`
  is called where lines 383–408 were.
- `tap`'s deps `[compass]` (381); the follow effect's deps
  `[map, fix, camera, turn, taps, snap]` and the `eslint-disable-next-line
  react-hooks/exhaustive-deps` with its reason (443): `cameraTurn` is the
  render's turn and is left out on purpose. commit-turn-test's two last tests
  (247, 263) prove the turn.
- The watch's options `{ enableHighAccuracy: true, maximumAge: 1000, timeout: 20_000 }`
  (379) and the quiet rule: a tap after `QUIET_MS` without a fix clears the
  watch and starts a new one (319–325; where-test: "a new one in its place at
  a tap after 10 s quiet"). Only `PERMISSION_DENIED` ends a watch (363–376).
- The `Locator` shape (238–263): `locator.tsx` reads `status`, `noFix`,
  `mode`, `heading`, `compass`, `tap`; `locator-mood.ts` reads `taps`,
  `fix`, `camera`.
- `TURN_DEG` at 3°: `direction-arrows.ts:363-372` counts on the compass
  camera easing only at a turn of 3° or more; the per-frame budget of the
  chevrons' hold (`chevrons-test`'s last test) assumes it.
- No effect, no state and no DOM: the dot, the button and the moods stay
  where they are (`visitor-location.tsx` renders them alone, the cheap-phone
  plan's step 15).
- The refs are the stable references: `offsetRef`, `readRef`, `cameraRef`
  written each render; `lastTaps`, `lastSnap`, `trackedZoomRef` kept across
  renders. None moves to state.

## 4. Risks and the nets

| risk | net |
| --- | --- |
| A rule's import path missed | `npm run typecheck`; `locator-test.mjs` (15 `test(` calls, the README's "pose, facing and motion", 9 named) with its import rewritten to `locator-rules.ts`; `locator-mood-test` (9) and `dot-gaze-test` (6) still pass. |
| The fix handler's arithmetic changed by `fixFrom` | New tests in `locator-test.mjs`: the browser's speed kept when it is a number ≥ 0, else `motionFrom`'s; its heading kept only when a number and the speed is at least `STILL_BELOW_MPS`, else the derived one; a fix older than 15 s dropped from the run; `time` from the position's timestamp, else `now`. where-test's walk (the beam turns with a walk, the camera follows) is the net in the browser. |
| The camera options changed by `visitorCamera` | New tests: tracked → the kept zoom, pitch 0, bearing 0; compass → `zoomForScale(COMPASS_SCALE_M, lat)`, pitch 45, the turn, or the map's bearing with none; 800 ms on a tap or a sheet change, 400 on a fix. where-test's 200 m on the scale bar, the tilt and north up again. |
| The let-go listeners | where-test: a drag lets go, an app camera move lets go (406 cites `APP_MOVE`); framing-test 217 is the app's side. |
| The compass listener's cleanup | where-test's compass checks with a `deviceorientationabsolute` event; `useCompass`'s `setHeading(null)` on cleanup moves with it. |
| The lint pass tonight (the `eslint-disable` at 443 has its reason already) | Rebase after their merge; `369920e` landed today, so this file is fresh. |

CI: a PR under `src/features/locator/` alone runs the public suites and skips
the studio's (`ci.yml`, the `changes` job). where-test (49) is the one that
matters; run it locally first with `PARAPO_NO_TILES=1` where tiles are
blocked.

## 5. Step order

One pull request, four commits:

1. `locator-rules.ts`: the types, constants and pure functions out; the
   three importers and `locator-test.mjs` follow; where-test's header
   comment names the new file. Typecheck, lint, unit.
2. `use-compass.ts`.
3. `use-camera-let-go.ts`.
4. `fixFrom` and `visitorCamera` into `locator-rules.ts`, called from the
   handler and the follow effect, with their tests (about eight `test(`
   calls added to `locator-test.mjs`).

Then where-test, and commit-turn-test is in the unit run.

## 6. Model advice

Commits 1–3 are straightforward: Opus 5.5. Commit 4 touches the watch's fix
handler, which only where-test exercises in a browser, so have the diff read
once against lines 337–357 and 419–435 before pushing: Opus 5.5 can do it,
with that read as the gate; if the session is unsure, stop after commit 3 and
leave commit 4 as a second PR for Fable 5.1.

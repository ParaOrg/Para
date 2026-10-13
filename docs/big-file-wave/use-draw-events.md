# `src/features/studio/drawing/use-draw-events.ts` — the plan

493 lines on `staging` at 6e718da. Born in stage 10a at 249 lines (1d281c4:
"the pointer: clicks, drags, right-clicks, the Extend pick"), it doubled
when drawing by finger went in (1e5f082, 53b0fe7, d8a74f3, 98b2f9b,
2026-10-02): touch start, move, end and cancel, the long-press, the echo
click, the point under a finger, the fingers on the map, and the second
finger's put-back.

No open PR touches this file. Its type imports (`AreaTarget`, `Borrow`,
`FollowOffer`, `Picking` at line 9) move to `drawing-types.ts` in the
`use-drawing.ts` split, so this one follows that one.

## 1. What the file does today

| Lines   | Responsibility                                                                                                                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11–31   | The pointer's numbers, each with its reason: `PICK_PX` (40), `FINGER_PX` (20, a dot is 6 px), `DRAG_START_PX` (6), `LONG_PRESS_MS` (500), `ECHO_MS` (700, with Android's contextmenu note).                            |
| 33–35   | `IndexedFeature`: a feature's `index` property.                                                                                                                                                                         |
| 37–53   | The doc: what a click, a drag and a right-click do; what a finger does; "the handlers are bound once per drawing and read the drawing through its refs".                                                                |
| 54–95   | The signature: `map`, `drawing`, eight refs, twelve actions; the actions destructured.                                                                                                                                  |
| 96–109  | The one effect's guard (the layers must exist, 98), the crosshair, iOS's callout off, box zoom and double-click zoom off (105–109).                                                                                      |
| 111–127 | The effect's locals: `touch` (the finger's state), `echoUntil`, `lastTouchEnd`, `isEcho`, `fromFinger`.                                                                                                                 |
| 129–156 | `closesBar` (a tap with the bar open only closes it) and `offerFollow` (a finger's point on a saved line offers to follow it).                                                                                          |
| 158–200 | The clicks: `onMapClick` (Extend's pick within `PICK_PX`, 163–173; else add), `onLineClick` (a dot wins over the line, 185–187; the closing edge appends, 190–196; shift straightens).                                   |
| 202–225 | The right-clicks: `onPointContext` deletes; `onMapContext` asks `follow` with the ids under it.                                                                                                                          |
| 227–299 | The mouse drag: `dragIdx`/`dragMoved`/`dragModes`, `dragTo` (the rubber band, 232–252), `settleDrag` (which gaps to re-route, 257–269), `onDragEnd`, `onPointDown` (left button only, the document's mouseup, 296–298). |
| 301–328 | `pointUnderFinger` (the nearest point within `FINGER_PX`) and `fingersOnMap` (the touches inside the canvas container, 316–321).                                                                                        |
| 330–423 | The touch: `onTouchStart` (holds the map still over a point), `onTouchMove` (the drag starts past `DRAG_START_PX`), `putBack` (a second finger or a cancel, with the re-ask of waiting gaps, 383–391), `onTouchCancel`, `onTouchEnd` (the echo window, select or settle). |
| 425–433 | The cursors: grab over a point, copy over the line, crosshair elsewhere.                                                                                                                                                 |
| 435–450 | The binding, in an order that matters (435–437: the line's click before the map's).                                                                                                                                     |
| 452–475 | The cleanup: every listener off, the timer cleared, drag pan, box zoom and double-click zoom back, the cursor and the callout cleared.                                                                                   |
| 476–492 | The dependency list: `map`, `drawing`, `refs` and all twelve actions.                                                                                                                                                   |

Three things are written twice: the unique ids under a point (147–153 and
214–220), the two gaps round a moved point and their modes (263–268, and
385–391 with a waiting check), and the mode pair read off the segments
either side of a point (291 and 360).

## 2. The split

The effect stays one effect. Its handlers share mutable locals — `touch`,
`dragIdx`, `dragMoved`, `dragModes`, `echoUntil`, `lastTouchEnd` — and a
mouse drag and a finger drag settle through the same `settleDrag`. Two
effects would need that state shared across them, which is a new design,
not a move. The seam is below the effect: the pure arithmetic out to a
tested file, and each gesture's handlers built by a plain function over one
shared context, bound by the effect in the order it binds them today.

### `draw-gestures.ts` — the pointer's arithmetic, pure

```ts
/** The distinct string ids among features (147–153, 214–220). */
export function featureIds(features: Array<{ properties?: { id?: unknown } }>): string[];
/** The index of the nearest of `pixels` within `reach` of `at`, or null (302–314, over projected points). */
export function nearestWithin(pixels: Array<{ x: number; y: number }>, at: { x: number; y: number }, reach: number): number | null;
/** The modes either side of point `i` (291, 360). */
export function modesAround(segments: Segment[], i: number): [SnapMode | undefined, SnapMode | undefined];
/**
 * Point `i` moved to `point`: the points and the two rubber-banded segments
 * round it (236–251). The new segments are returned so the caller marks
 * them as stand-ins; `join` is the join point, replaced when it is the one moved (237).
 */
export function rubberBand(points, segments, i, point, modes, join: LngLat | null): { points; segments; standIns: Segment[]; join: LngLat | null };
/** The one request for the gaps round point `i` of `last + 1` points (263–268): before, after, or both. */
export function gapsAround(i: number, last: number, modes: [SnapMode, SnapMode]): { from: number; modes: SnapMode[] } | null;
/** The same for a put-back (385–391): only the gaps that were still waiting. */
export function waitingGapsAround(before: Segment | undefined, after: Segment | undefined, i: number, isWaiting): { from: number; modes: SnapMode[] } | null;
```

The numbers at 11–31 stay in the hook file: `PICK_PX` and `FINGER_PX` are
passed to `nearestWithin` as `reach`, so the pure file knows no pixels of
its own.

Why: these are the lines a reader has to work out by hand today, and the
only ones that can be tested without a map.

### `draw-clicks.ts`, `draw-mouse.ts`, `draw-touch.ts` — the handlers

Each exports one plain function (no React, no hook) taking the context and
returning its handlers:

```ts
// The shared context: what every gesture reads and the drag state they pass between them.
export interface DrawContext {
  map: MapLibreMap;
  canvas: HTMLCanvasElement;
  refs: DrawRefs; // the hook's `refs` parameter, as today
  actions: DrawActions; // the hook's `actions` parameter, as today
  drag: { idx: number | null; moved: boolean; modes: [SnapMode | undefined, SnapMode | undefined] };
  echo: { until: number; lastTouchEnd: number }; // 124–125
}

// draw-clicks.ts (129–225): closesBar, offerFollow, onMapClick, onLineClick, onPointContext, onMapContext
export function clickHandlers(ctx: DrawContext): { onMapClick; onLineClick; onPointContext; onMapContext };
// draw-mouse.ts (227–299, 425–433): dragTo, onDragMove, settleDrag, onDragEnd, onPointDown, the cursors
export function mouseHandlers(ctx: DrawContext): { onPointDown; onDragMove; onDragEnd; enterPoint; enterLine; leave; dragTo; settleDrag };
// draw-touch.ts (301–423): pointUnderFinger, fingersOnMap, onTouchStart, onTouchMove, putBack, onTouchCancel, onTouchEnd
export function touchHandlers(ctx: DrawContext, mouse: { dragTo; settleDrag }): { onTouchStart; onTouchMove; onTouchEnd; onTouchCancel; clearTimer: () => void };
```

`DrawRefs` and `DrawActions` are the two parameter types at 57–80, named
and exported from `use-draw-events.ts` so the three files share them. The
touch handlers call the mouse's `dragTo` and `settleDrag` (368, 422), so the
mouse's are built first and handed over. The `touch` local (115–121) and
its timer become the touch file's own; the cleanup's `clearTimeout(touch.timer)`
(462) becomes `clearTimer()`.

The hook keeps: the guard and the setup (96–109), building `ctx`, the three
calls, the binding in today's order (438–450), the cleanup (452–475) and
the dependency list (476–492). About 140 lines.

Why these three: the commits since stage 10a touched touch alone (1e5f082,
d8a74f3) or the point bar's taps alone (98b2f9b); a mouse on a desktop and
a finger on a phone are two reasons to change, and the clicks a third. Each
file's doc paragraph is already written at 38–49: one paragraph each.

### Folder rules

All in `drawing/`, as `draw-layers.ts` is: the studio's one folder that
touches MapLibre. The handler files are `.ts` with no React in them, named
by what they are, not `use-*`: they are not hooks. `draw-gestures.ts` is
pure and Node can load it for the unit test.

## 3. What must not change

- **The layer ids** `POINT_LAYER`, `HIT_LAYER`, `CLOSING` and
  `ROUTES_HIT_LAYER` are imported (4, 8) and stay imported; nothing here
  defines an id.
- **The binding order** (435–450) and the comment that says why: the line's
  click listener is added before the map's, so a tap on the line that closes
  the point bar closes it there. The same order of `map.on` calls, in the
  hook, whatever file the handlers come from.
- **The cleanup** (452–475), complete: a listener left bound survives the
  drawing's end; `dragPan`, `boxZoom`, `doubleClickZoom` must come back on;
  the document's `mouseup` (298, 469) must come off.
- **The dependency list** (476–492) names every action by name. It stays a
  list of the destructured actions, never `[actions]`: the hook that calls
  this builds `actions` as a fresh object literal each render
  (use-drawing.ts:619–632), and an object dependency would rebind every map
  handler every render and drop a drag's locals mid-drag.
- **The shared drag state** is one object. `onTouchMove` sets `drag.idx`
  (358), `onTouchEnd` reads and clears it (416–417), the mouse's
  `onDragEnd` clears it (273); the touch's `putBack` reads it (378); the
  cursors check it (426–432). If `draw-mouse.ts` kept its own copy, a finger
  drag would end with the mouse's cursor logic reading stale state.
- **Timing.** `performance.now()` for the echo window (126–127, 334, 408,
  414): a split must not swap one site to `Date.now()` or `e.timeStamp`.
- **Listener options.** Today every listener goes through `map.on` and one
  `document.addEventListener('mouseup', …)` (298); no `passive` flags. The
  touch handlers are MapLibre's `touchstart`/`touchmove`/`touchend`/
  `touchcancel` (443–446), not the canvas's.
- **The refs are read live**, never destructured into locals at build time:
  `refs.points.current` at the moment of the event. `clickHandlers(ctx)`
  closes over `ctx.refs`, as the effect closes over `refs` today.
- **`e.preventDefault()` placement**: `onPointContext` first (203),
  `onMapContext` only once ids are found (223), `onPointDown` after the
  button check (288), `onTouchMove` never (the map pans).

## 4. Risks, and what guards each piece

| Piece                | Risk                                                                                                                         | Guarded by                                                                                                                              |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `draw-gestures.ts`   | `gapsAround` at the first or last point; `rubberBand` copying the join point instead of replacing it (237).                   | New `tests/unit/draw-gestures-test.mjs`; studio-phone-test (a drag from a point, one router request on lifting); regression-gestures.   |
| `draw-clicks.ts`     | `closesBar` losing its "clears the follow offer first" (134); the Extend pick's pixel test.                                   | studio-phone-test (the point bar's "next tap only closes it", the follow offer); extend-test (the pick); hotspot-test (the closing edge). |
| `draw-mouse.ts`      | The document `mouseup` not removed; the cursor restored on a wrong branch.                                                    | regression-gestures (29), snap-test (shift straightens), hotspot-test (a corner dragged with no router).                                |
| `draw-touch.ts`      | The timer cleared in the wrong place; `fingersOnMap` losing its container filter (316–321: a thumb on the toolbar).           | studio-phone-test (38): every case at 11–31 and 316–321 has a check there, by name.                                                     |
| The hook's binding   | Order, cleanup, dependencies.                                                                                                 | All six drawing suites; the cheap-phone budget in studio-phone-test.                                                                    |

The drawing suites do not run on a pull request (`ci.yml:85`): run them by
`workflow_dispatch` on the branch after the handler commits and quote the
counts, as the `use-drawing.ts` plan says. save-test (84) on the PR covers
only a mouse's clicks on a desktop.

New unit test, `tests/unit/draw-gestures-test.mjs`: `featureIds` dedupes and
drops non-strings; `nearestWithin` picks the nearer of two dots inside reach
and none outside; `modesAround` at the ends; `rubberBand` for a first, a
middle and a last point, the join replaced only when it is the moved point;
`gapsAround` for the first, a middle and the last point, and a single point
(null); `waitingGapsAround` with neither, one and both gaps waiting.

## 5. The step order

1. `draw-gestures.ts` with its test; the hook's `offerFollow`,
   `onMapContext`, `pointUnderFinger`, `dragTo`, `settleDrag`, `putBack`,
   `onPointDown` and `onTouchMove` call it. The locals and the binding do
   not move. Counts unchanged; studio-phone-test run by hand.
2. Name and export `DrawRefs` and `DrawActions`; add `DrawContext`. No
   behaviour.
3. `draw-clicks.ts`: move 129–225 into `clickHandlers(ctx)`.
4. `draw-mouse.ts`: move 227–299 and 425–433 into `mouseHandlers(ctx)`,
   with the drag state on `ctx.drag`.
5. `draw-touch.ts`: move 301–423 into `touchHandlers(ctx, mouse)`, the
   `touch` local and its timer inside; the cleanup calls `clearTimer()`.
6. The hook's doc (37–53) names the four files; each file takes its
   paragraph.

If the reviewer wants less, steps 1–2 alone are a sound stopping point:
they remove the three duplicates and leave a 430-line effect that is all
handlers, with nothing left to test by hand but what the suites test.

## 6. Model advice

**Fable 5.1** for steps 3–5. The split is a pure move on paper, but every
handler reads shared mutable locals and `performance.now()`, the binding
order and the cleanup are the behaviour, and the only suite that exercises
a finger (studio-phone-test) does not run on the PR. Steps 1–2 are Opus
5.5 work, with the unit test to catch an index slip.

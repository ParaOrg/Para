# `src/shared/ui/bottom-sheet.tsx` — the plan

550 lines on `staging` at 6e718da. The sheet was written in one piece on
the owner's "make it a universal rule as component" (2026-09-30) with its
snap arithmetic already in `sheet-gesture.ts` (pure, `sheet-snap-test`).
Since then it took the drag mark for the LocatorButton (fdc4185, 887ad6c,
2026-10-03), the strip of map at Max (710d301, 1f1a00c), and the camera's
room beside it (`roomBeside`, `clearOfSheet`, 2026-10-01 to 10-13).

PR #145 (stories/public) adds `bottom-sheet.stories.tsx` (177 lines) beside
it and edits nothing here; the split goes in after it, and keeps its
stories passing. Its callers are all in `features/routes/cards/` and
`features/locator/locator.stories.tsx`; no studio file imports it.

## 1. What the file does today

| Lines   | Responsibility                                                                                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–31    | Imports: React, `IconButton`, `useDialogFocus`, `useEscape`, `CloseIcon`, and twelve names from `sheet-gesture.ts`.                                                                                                                   |
| 33–73   | `Props` (the suites' `testId`, `hidden` for the list behind a trip, `floats`, `height`) and `SheetHeight`, the height a caller keeps.                                                                                                  |
| 75–85   | `FLOATS_AT`: the `@float:` corner and the `@wide:` card.                                                                                                                                                                              |
| 87–110  | The doc: every card is this sheet; the three heights, the drag, the flick, the body's scroll at Max.                                                                                                                                   |
| 111–139 | The refs, the snap (own or the caller's, 126–128), `dragging`, `measureSafeTop()` during render and `opensAt` (129–137: drawn with it, never changed after), focus and Escape.                                                         |
| 141–162 | The `data-dock-dragging` mark on the page: set in a layout effect only by the sheet that put it there (141–152), taken off at unmount by a second layout effect holding the host from the mount (153–162).                             |
| 164–171 | `settle` and the `now` ref the once-bound listeners read.                                                                                                                                                                             |
| 173–188 | `docked`, `show`, `at()`: `--sheet-y` on the sheet and `--dock-y` on the host while the sheet shows (176–181, the owner's ScreenLocationBehavior).                                                                                     |
| 190–196 | `lastPress`, and the drag's `AbortController` let go at unmount.                                                                                                                                                                      |
| 198–268 | The pull down from the list's top at Max, by touch events (198–201: why not pointer events), and the wheel's deliberate push (234–236); bound once, with the disable comment saying why (267).                                         |
| 270–323 | `onPointerDown`: a drag and a tap are one gesture until `DRAG_PX` (270–272); the header brings the sheet down at Max (280–281); Low's body raises (282–285); listeners on the window, not captured (290–292); the click swallowed. |
| 325–332 | `setRefs`: the own ref and the caller's.                                                                                                                                                                                              |
| 334–404 | The JSX: the dialog with its testid, `data-snap`, `data-floats`, `--sheet-y`, the transition off while dragging (352); the handle (`dock-handle`, its label by height); the header; the body with the keyboard-focus rule (379–387) and Max's bottom padding (392–398). |
| 406–420 | `SheetHeader`, a second exported component.                                                                                                                                                                                           |
| 422–431 | `HANDLE_LABEL`, what a screen reader hears.                                                                                                                                                                                           |
| 433–453 | `clearOfDock`: where a point the camera glides to should sit, beside the corner or above the dock.                                                                                                                                    |
| 455–461 | `framedAt`: Middle when higher.                                                                                                                                                                                                       |
| 463–477 | `measureSafeTop`: the status bar's height, once, into `sheet-gesture`'s `setSafeTop`.                                                                                                                                                 |
| 479–487 | `FIT_MARGIN_PX` (48, the owner's labels of 2026-10-13), `FIT_ROOM_MIN_PX`.                                                                                                                                                           |
| 489–523 | `roomBeside`: MapLibre's fit padding beside or above the sheet, framed at Middle when the strip left is under the minimum.                                                                                                            |
| 525–533 | `showsAt`: how much of a docked sheet shows at a snap.                                                                                                                                                                                |
| 535–550 | `clearOfSheet`: the camera's offset with the sheet left where it is (the owner's ask, 2026-10-01).                                                                                                                                   |

Three things in one file: a component (111–404), a second component
(406–420), and 118 lines of camera geometry (433–550) that import no React
and are called by three hooks in `features/routes/cards/` (`use-card-camera.ts:4`,
`use-overviews.ts:4`, `use-card-stack.ts:4`).

## 2. The split

### `shared/ui/sheet-room.ts` — the room a sheet leaves, no React

Lines 433–461 and 479–550, with the DOM reads peeled off the arithmetic:

```ts
export interface Rect { top: number; bottom: number; left: number; right: number; height: number }
export type Room = { top: number; bottom: number; left: number; right: number };

/** The arithmetic of clearOfDock (446–452) over rects: the corner's half-width, or half of what shows above the dock. */
export function clearOfRects(map: Rect, dock: Rect | null, shows: number): [number, number];
/** The arithmetic of roomBeside (502–522) over rects and what the dock shows at `snap` and at Middle. */
export function roomFromRects(map: Rect, dock: Rect | null, shows: number, showsAtMiddle: number, snap: Snap): Room;
/** Middle when higher (461). */
export function framedAt(snap: Snap): Snap;

// The DOM wrappers the hooks call, signatures as today:
export function clearOfDock(map: HTMLElement, dock: HTMLElement | null, snap?: Snap): [number, number];
export function clearOfSheet(map: HTMLElement, dock: HTMLElement | null, snap: Snap): [number, number];
export function roomBeside(map: HTMLElement, dock: HTMLElement | null, snap: Snap): Room;
```

`showsAt` (525–533) stays private to this file; `FIT_MARGIN_PX` and
`FIT_ROOM_MIN_PX` move with their comments (479–487). The three hooks
change one import line each. The JSDoc at 433–440, 455–459, 489–496 and
535–543 moves word for word: it is where the owner's asks of 2026-10-01 are
recorded.

Why: the sheet renders; this measures. `useOverviews` and `useCardCamera`
are the camera, and they should not import a component file to get a
number. The pure cores get the unit test the DOM wrappers cannot have.

### `shared/ui/sheet-gesture.ts` gains `measureSafeTop`

Lines 463–477 move next to `setSafeTop` (sheet-gesture.ts:107–111), which
it feeds. The one call site (136) imports it. `sheet-gesture.ts` already
touches `document` in `swallowTheTapsClick`; the guard
`typeof document === 'undefined'` (469) keeps `sheet-snap-test` running
under Node.

### `shared/ui/sheet-header.tsx` — `SheetHeader`

Lines 406–420, with its doc. One exported component per file. The caller
is `hotspot-card.tsx:3` (`import { BottomSheet, SheetHeader, type SheetHeight }`),
which becomes two imports. A story: `Shared/SheetHeader` (CLAUDE.md: every
`shared/ui` component has one), one state, long content.

### `shared/ui/use-sheet-gestures.ts` — `useSheetGestures`

Lines 129–131 (`dragging`), 164–171, 190–196, 198–268 and 270–323: how a
finger or a mouse moves the sheet. The component keeps the DOM it writes.

```ts
export function useSheetGestures({
  sheet, handle, head, body, // the four refs
  snap,
  setSnap,
  onClose,
  /** Writes --sheet-y (and --dock-y) for `shown` px on show: the component's `show` (175). */
  show: (shown: number) => void,
  /** Docked, not floating (174). */
  docked: () => boolean,
}: {...}): {
  dragging: boolean;
  onPointerDown: (e: ReactPointerEvent<HTMLDivElement>) => void;
  /** The body's onFocus rule (379–387): focus from the keyboard below Max raises the sheet; a press's does not. */
  onBodyFocus: (e: FocusEvent<HTMLDivElement>) => void;
};
```

Inside: `dragging` state, `settle`, `now`, `lastPress`, the drag's
`AbortController` and its unmount abort, the pull-and-wheel layout effect
with its disable comment (267), and `onPointerDown`. `onBodyFocus` takes
the body's `onFocus` body (383–387) so `lastPress` stays private.

Why: the gestures are the part that changed on the owner's trials
(sheet-gesture.ts:75–82) and on the reviewer's note (23–27 there); the
rendering is the part the ds-reviewer reads. Two reasons to change.

### What stays in `bottom-sheet.tsx`

`Props`, `SheetHeight`, `FLOATS_AT`, the doc, the refs and snap, `opensAt`,
focus and Escape, the two dock-mark layout effects, `at`, `show`, `docked`,
`setRefs`, the JSX and `HANDLE_LABEL`. About 260 lines, 70 of them the JSX.

### Folder rules

All stay in `shared/ui/`, which "knows nothing about any feature"; nothing
new imports a feature. `sheet-room.ts` and the gesture hook are `.ts`; the
header is `.tsx`. No barrel: `shared/ui/index.ts` is "once it is needed",
and three import lines do not need it.

## 3. What must not change

- **Test ids and data attributes**: `data-testid={testId}` (`chooser`,
  `card`: phone-test, visitor-test, group-test, save-test, pwa-test),
  `dock-handle` (phone-test, where-test), `data-snap` (phone-test),
  `data-floats`, `role="dialog"`, `aria-label`, `tabIndex={-1}`, `hidden`.
- **The CSS contract**: `--sheet-y` on the sheet, `--dock-y` and
  `data-dock-dragging` on `[data-dock-host]` (the LocatorButton follows
  them: where-test "the card that tap opened set to another height while
  the camera follows"), the `sheet-floating:` and `sheet-low:` variants
  (global.css:31–43), the class strings at 346–355, 370, 388–391.
- **`HANDLE_LABEL`** word for word (the ds-reviewer's finding, 2026-09-30).
- **Layout effect order**: the mark effect (144–152), the unmount
  cleanup holding the host from the mount (157–162), the drag abort (196),
  the pull effect (202–268) — all `useLayoutEffect`, in that order. The hook
  is called after the two mark effects so the order of cleanups is today's
  (React runs cleanups in order of declaration): the pull's listeners come
  off before the host loses its mark.
- **`measureSafeTop()` runs during render before `opensAt`** (136–137):
  the first `follow` reads `heightsFor`, which reads `safeTop`.
- **`opensAt` is lazy state, set once** (137): "never changed after, so
  React leaves the drag's and the glide's --sheet-y alone".
- **Listener options**: `touchstart` passive, `touchmove` not passive,
  `wheel` passive (261–265); the window's pointer listeners under one
  `AbortController` (318–322), not captured (292).
- **`swallowTheTapsClick` before `settle`** (305–307) and `hotspot()` first
  (304, 311).
- **`snap` and `setSnap` resolve to the caller's `height`** when given
  (127–128): `SheetHeight` is the shared height three cards keep
  (use-card-stack.ts:63).
- **The numbers**: `FIT_MARGIN_PX` 48 (the owner's labels of 2026-10-13),
  `FIT_ROOM_MIN_PX` 48, `DRAG_PX / 3` (221), 200 ms and 300 ms (242, 245),
  800 ms (385), `-1` (450, 511).

## 4. Risks, and what guards each piece

| Piece                 | Risk                                                                                                          | Guarded by                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `sheet-room.ts`       | A sign slipped in `clearOfRects` (452: negative, half); `framedAt` applied at the wrong snap in `roomFromRects`. | New `tests/unit/sheet-room-test.mjs`; phone-test (136: the trip framed "as at Middle at Max, closer above Low", the hintuan "above where Middle would be"); visitor-test (the camera clear of the corner card); where-test. |
| `measureSafeTop` move | Called after `opensAt`; the Node guard lost.                                                                   | `sheet-snap-test` (runs under Node); phone-test (a notch: "Max, the whole map, clear of a phone's notch").                                  |
| `SheetHeader`         | Nothing but an import path.                                                                                    | visitor-test and save-test (a hotspot's card closes by ✕); the new story.                                                                   |
| `useSheetGestures`    | A listener option changed; the cleanup order; `lastPress` read after the hook's own state updates.             | phone-test (finger and mouse drags, the handle round, "even with the tap's click a second late"); where-test (the dock follows a drag); PR #145's `bottom-sheet.stories.tsx` (its play functions, if any, drive the handle). |
| The whole             | The stories branch and this one both touching `shared/ui/`.                                                   | Branch after #145 merges.                                                                                                                  |

phone-test, where-test, visitor-test and pwa-test run on the PR (anything
in `shared/` runs both jobs, `ci.yml:97–98`); so do save-test and
studio-scale-test. No drawing suite is needed.

New unit test, `tests/unit/sheet-room-test.mjs`: `clearOfRects` for a dock
in the corner (half its width to the right), a dock along the bottom (half
of what shows, upward), no dock, a hidden one (`[0, 0]`); `roomFromRects`
for the corner (left margin grows), the bottom at Low (bottom = shows +
margin), at Max (framed at Middle's shows), a strip under `FIT_ROOM_MIN_PX`
(the margins give way to `(height − shows − 48) / 2`, never below 0);
`framedAt` for the four kinds of snap.

## 5. The step order

1. `sheet-room.ts`: move 433–461 and 479–550; split each DOM function into
   its rect core and its wrapper; the unit test; the three hooks' imports.
2. `measureSafeTop` into `sheet-gesture.ts`; the import at 136.
3. `sheet-header.tsx` with its story; `hotspot-card.tsx`'s import.
4. `use-sheet-gestures.ts`: move the gesture state, the pull effect and
   `onPointerDown`; the body's `onFocus` becomes `onBodyFocus`.
5. The doc at 87–110 names the three files; `sheet-gesture.ts`'s header
   (1–5) says it holds the measure too.

Steps 1–3 are independent; step 4 follows 2 only (both touch the lines
near 136). Each builds, lints, passes the unit tests and the stories
build; phone-test and where-test on the push.

## 6. Model advice

**Opus 5.5 for steps 1–3 and 5; Fable 5.1 for step 4**, or Opus with a
Fable review of the diff before the push. The room and the header are
clean moves with a test and a story each. The gesture hook is a move of
160 lines whose behaviour is its listener options, its cleanup order and
two refs read by once-bound closures, and phone-test is the only suite
that drives a finger on it.

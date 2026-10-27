# `src/features/studio/drawing/use-drawing.ts` — the plan

703 lines on `staging` at 6e718da (2026-10-13). The first big-file pass
already cut it once: stage 10a (PR #18, commit 1d281c4) took the draft, the
gap resolver, the draw layers and the pointer's events out of the 1,065-line
`useDrawing.ts`, and the header comment at lines 22–29 still says what stayed:
"the state, the edits and the modes". Since then the point bar, the touch
drawing and the follow offer went in (53b0fe7, d8a74f3, 98b2f9b, 2026-10-02)
and the hotspot adoption (84b678b, 2026-10-03), and it is back over 700.

Line numbers below are `staging`'s today. PR #143 (the studio's lint pass)
edits this file — the ref mirroring at 134–151 becomes one `useLayoutEffect`,
and the draft restore gains a disable comment at 573 — so the split goes in
after #143 merges, re-anchored on the quoted comments rather than the numbers.

## 1. What the file does today

| Lines   | Responsibility                                                                                                                                                                                                                                             |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–20    | Imports: MapLibre's type, React, `coarsePointer`, geo, and every drawing sibling (borrow, draft, draw-layers, gap-resolver, snap, use-draw-events, uturns).                                                                                                 |
| 31–77   | The drawing's shared types: `Target`, `HotspotKind`, `AreaTarget`, `Borrow`, `Picking`, `FollowOffer`, and `Drawing = ReturnType<typeof useDrawing>` (70). Five sibling files import these types back from here (`draft.ts:5`, `gap-resolver.ts:6`, `draw-layers.ts:10`, `use-draw-events.ts:9`, `panels/new-buttons.tsx:1`). |
| 79–88   | `Undone`, what the point bar's Delete keeps, and `PUT_BACK_MS`.                                                                                                                                                                                             |
| 90–127  | The hook's signature (`map`, `opts.onFollow`) and ten `useState`s: drawing, controlPoints, segments, freehand, target, area, borrow, picking, selected, deleted, followOffer.                                                                               |
| 129–158 | The refs the map's handlers read, kept current by every mutator (comment 129–130): `cpRef`, `segRef`, `freehandRef`, `areaRef`, `pickingRef`, `joinRef` (139–147, the join point held by identity), `borrowRef`, `followRef`, `selectedRef`, `connectedRef` (153–158, Undo's whole-join step). |
| 160–165 | `useGapResolver` over a memoised refs bundle (`useMemo(…, [])`, 162) — `writeSegments`, `resolveGaps`, `isStandIn`, `markStandIn`.                                                                                                                         |
| 167–181 | `select` and `writePoints` (a point count change clears the selection, 172–173).                                                                                                                                                                           |
| 183–265 | The four edits: `addPoint` (with the before-a-borrowed-end splice, 186–205), `insertPoint`, `deletePoint` (heals two segments into one), `toggleSegment`.                                                                                                  |
| 267–290 | `undo`: a whole join in one step (268–280), a point ahead of the join (281–287), else the last point.                                                                                                                                                      |
| 292–335 | The point bar: `deleteSelected`, `putBack` (with the re-ask of waiting stretches, 314–327), the Put back timer effect (330–335).                                                                                                                            |
| 337–354 | `takeFollowOffer` (a doubled JSDoc at 337–342: the first line is stale) and `lineNow`.                                                                                                                                                                     |
| 356–366 | `reset`.                                                                                                                                                                                                                                                   |
| 368–413 | The route modes: `start`, `load`, `startExtend`.                                                                                                                                                                                                           |
| 415–434 | `keep`: Extend takes one side of the picked spot (`cutAt`), sets `joinRef` for a kept end.                                                                                                                                                                 |
| 436–504 | `joinGate` (asked before the line's drawing is fetched, 445–450) and `connect` (a right-click's join and follow; a doubled JSDoc at 436–444 belongs to `connect`, not `joinGate`).                                                                          |
| 506–558 | The hotspot modes: `startArea`, `adoptHotspot` (the written row becomes the outline's own, 520–525), `loadArea` (the ring's straight segments, 542–544), `cancel`.                                                                                          |
| 560–598 | The draft: the restore effect, once per page (562–568), its re-ask of pending gaps (584–595), then `useDraftSaving` (598).                                                                                                                                  |
| 600–633 | `useDrawLayers`, then `useDrawEvents` with a second memoised refs bundle (606–618) and the actions bag (619–632).                                                                                                                                           |
| 635–651 | Derived: `line`, `uTurns`, `unresolved`, and `useDrawRendering`.                                                                                                                                                                                           |
| 653–702 | The returned API, the `Drawing` the toolbar, the point bar, the panels, `useSaveTarget`, `useSaveFacts`, `useFollow` and the workshop read.                                                                                                                |

Two copies of one rule live here: "the runs of gaps still waiting for the
router, each run one request" is written at 316–327 (`putBack`, over
`isStandIn`) and again at 587–595 (the restore, over `pending`), and a third
time in `use-draw-events.ts:385–391` for the two gaps round a dragged point.

## 2. The split

Six files; the hook keeps its name, its signature and the object it returns.

### `drawing-types.ts` — the types, no React

Lines 31–77 minus `Drawing` (70), moved as they are:
`Target`, `HotspotKind`, `AreaTarget`, `Borrow`, `Picking`, `FollowOffer`.
`Drawing` stays in `use-drawing.ts` (it is the hook's return type).

Why: five files import these types from the hook, and the hook imports those
files (draft, gap-resolver, draw-layers, use-draw-events). Type-only cycles
compile, but every new file this plan adds would join the cycle. One leaf
file of types ends it. `use-draw-events.ts:9`, `draft.ts:5`,
`gap-resolver.ts:6`, `draw-layers.ts:10` and `panels/new-buttons.tsx:1`
change their import path and nothing else.

### `drawing-edits.ts` — the array arithmetic, pure

```ts
export interface Edit {
  points: LngLat[];
  segments: Segment[];
  /** The gaps the router must be asked for after this edit, or null. */
  resolve: { from: number; modes: SnapMode[] } | null;
}
/** addPoint before a borrowed end (186–205): the point goes in ahead of the join. */
export function addBeforeJoin(points, segments, join: number, point, mode): Edit;
/** insertPoint (215–228): split gap `gap` by dropping `point` into it. */
export function insertInGap(points, segments, gap: number, point): Edit;
/** deletePoint (232–253): remove point `idx`, healing the two segments round it. */
export function removeAt(points, segments, idx: number): Edit;
/** loadArea (542–544): a ring's edges as straight segments. */
export function ringSegments(ring: LngLat[]): Segment[];
/** Runs of adjacent gaps `isWaiting` says are waiting: [from, to] pairs, each one request (316–327, 587–595). */
export function waitingRuns(segments: Segment[], isWaiting: (s: Segment) => boolean): Array<[number, number]>;
```

The hook's `addPoint`, `insertPoint`, `deletePoint`, `loadArea`, `putBack`
and the restore become: compute, `writePoints`, `writeSegments`, then
`resolveGaps` with what `resolve` says. The modes each caller passes stay
the caller's — `putBack` maps each gap's own `snap` (324), the restore fills
`'snapped'` (593): `waitingRuns` returns the runs and never the modes, so
both callers keep their answer to the letter.

Why: these are the only parts of the hook that are pure today, they are the
parts a bug would hide in (the index arithmetic round `join`, `idx === 0`,
`origLen - 1`), and the house method asks for a unit test for what becomes
pure. `straightSegment` stays in `snap.ts`; this file imports it.

### `draft.ts` gains `fromDraft`, pure

The restore effect (566–596) does two things: turns the stored draft into
state, and asks the router again. The first is pure:

```ts
/** What the restore effect sets, from a draft: pending stand-ins stripped to plain segments, the join point by index. */
export function restoredState(d: Draft): {
  area: AreaTarget | null;
  controlPoints: LngLat[];
  segments: Segment[];
  target: Target;
  borrow: Borrow | null;
  join: LngLat | null;
  /** The runs of pending gaps to ask the router for, none for an area (586). */
  pendingRuns: Array<[number, number]>;
};
```

The effect stays in `use-drawing.ts` and shrinks to "read, set each piece,
resolve each run". `DRAFT_KEY` and `useDraftSaving` do not move.

### `use-point-bar.ts` — `usePointBar`

Lines 79–88 (`Undone`, `PUT_BACK_MS`), 118–127 (the `deleted` and
`followOffer` state), 292–348 (`deleteSelected`, `putBack`, the timer
effect, `takeFollowOffer`), and the two derived fields of the return
(`canPutBack` 694, the `followOffer` guard 697–700).

```ts
export function usePointBar(
  refs: {
    points: RefObject<LngLat[]>;
    segments: RefObject<Segment[]>;
    join: RefObject<LngLat | null>;
    connected: RefObject<{ spot: LngLat; end: LngLat } | null>;
    selected: RefObject<number | null>;
    follow: RefObject<((ids: string[], at: LngLat, offered?: LngLat) => void) | undefined>;
  },
  actions: {
    deletePoint: (idx: number) => Promise<void>;
    writePoints: (pts: LngLat[]) => void;
    writeSegments: (next: Segment[]) => void;
    resolveGaps: (first: number, modes: SnapMode[]) => Promise<void>;
    isStandIn: (s: Segment) => boolean;
  },
  controlPoints: LngLat[],
): {
  deleteSelected: () => void;
  putBack: () => void;
  canPutBack: boolean;
  followOffer: FollowOffer | null;
  setFollowOffer: (o: FollowOffer | null) => void;
  takeFollowOffer: () => void;
  clear: () => void; // setDeleted(null); setFollowOffer(null) — what reset (359–360) does
};
```

`selected` and `select` stay in the hook: `writePoints` calls `select(null)`
(176) and `deletePoint` calls `writePoints`, so a point bar that owned
`select` would need `deletePoint` before it exists. The refs-in, actions-in
shape is `useGapResolver`'s (gap-resolver.ts:22–24) and `useDrawEvents`'s.

Why: the point bar is a finger's feature with its own timer, its own state
and its own suite (studio-phone-test), added in one commit (53b0fe7) and
fixed in another (98b2f9b) without touching an edit.

### `use-line-borrowing.ts` — `useLineBorrowing`

Lines 415–434 (`keep`) and 436–504 (`joinGate`, `connect`), with the stray
JSDoc at 436–444 put back over `connect` where it belongs.

```ts
export function useLineBorrowing(
  refs: {
    points; segments; area; picking; join; borrow; connected; freehand: RefObject<boolean>;
  },
  actions: { writePoints; writeSegments; resolveGaps; setBorrow; setPicking },
): {
  keep: (part: BorrowPart) => void;
  joinGate: () => { go: boolean; problem: string | null };
  connect: (v: DirectionDrawing, at: LngLat, backwards: boolean, drop?: LngLat) => string | null;
};
```

Why: the three are the only callers of `cutAt`, `nearestSpot` and
`reverseDrawing` (borrow.ts), and they are Extend's and the right-click's
half of the drawing. extend-test is their suite. `startExtend` (400–413)
stays with the modes: it starts a drawing, these edit one.

### `use-drawing.ts` — what stays

State and refs (90–158), the gap resolver, `select`/`writePoints`, the four
edits and `undo` as thin callers of `drawing-edits.ts`, `reset` and the seven
modes (`start`, `load`, `startExtend`, `startArea`, `adoptHotspot`,
`loadArea`, `cancel`), the restore effect over `restoredState`, the wiring
(`useDraftSaving`, `useDrawLayers`, `useDrawEvents`, `useDrawRendering`), the
derived values and the return. About 330 lines.

A seventh file, `use-drawing-modes.ts`, would take 356–413 and 506–558 and
leave the hook near 230. It would receive seven setters and three refs to
set nothing but state, and gain nothing a reader can test; this plan leaves
it out and says so. If the owner wants it, it is one more pure move.

### Folder rules

All in `drawing/`, the studio's concern folder that already owns MapLibre
(draw-layers.ts, use-draw-events.ts). Hooks are `use-x.ts`; the two pure
files have no React import and Node can load them (`tests/unit` runs under
`--experimental-strip-types`, as `places-test.mjs` does for `places.ts`).
Nothing outside the feature changes: `studio/index.ts:16` still exports
`useDrawing` and nothing else from this folder.

## 3. What must not change

- **The draft contract.** `para.draft.v1` and the stored shape with the
  database's words (`variantId`, `stopId`) stay in `draft.ts` (14, 36–61);
  seven suites and `check-build.mjs:90` read the key. `restoredState` reads
  a `Draft`, never storage.
- **Ids.** None live here. `draw-*` ids are `draw-layers.ts`'s and `saved-*`
  the routes map's; neither file changes.
- **The returned API.** Every member at 653–702, by name and type. The
  stories fake it (`save-panel.stories.tsx:55–67`, `hotspot-panel.stories`);
  `SaveNotices` types its props as `Drawing['segments']` and
  `Drawing['uTurns']`.
- **Effect order.** Effects run in the order their hooks are called:
  1. The restore effect (566) before `useDraftSaving` (598). In the first
     commit the saving effect sees the empty state and removes the key, the
     restored state then writes it back; the lint PR's disable comment at 573
     says why this is not lazy initial state. Whatever file the restore ends
     in, it is called first.
  2. `useDrawLayers` (602) before `useDrawEvents` (603): the events' effect
     returns early unless `POINT_LAYER` and `HIT_LAYER` exist
     (use-draw-events.ts:98). Rendering (651) after both.
  3. The Put back timer (330–335) depends on `deleted` alone; its home moves
     with the state.
- **Stable references the events rely on.** `useDrawEvents`' effect lists
  `refs` and every action as a dependency (use-draw-events.ts:476–492). A
  new identity rebinds every map handler and runs the cleanup, which calls
  `map.dragPan.enable()` and drops the drag's locals mid-drag. So:
  - both refs bundles stay `useMemo(…, [])` (162, 606–618);
  - `addPoint`, `insertPoint`, `deletePoint`, `toggleSegment`, `select`,
    `writePoints`, `writeSegments`, `resolveGaps`, `markStandIn`,
    `isStandIn`, `setPicking`, `setFollowOffer` keep the dependency lists
    they have (all `useCallback` over other stable callbacks, or setters);
  - a hook that returns one of these (`usePointBar`'s `setFollowOffer`)
    returns the setter itself, not a wrapper.
- **`joinRef` held by identity** (139–147): `drawing-edits.ts` must splice
  the very point objects it was given, never copies, or `indexOf` (186,
  281) stops finding the join. The same for `connectedRef` (271–272).
- **`lineNow`** stays `useCallback(…, [])` (351): `useFollow` reads it
  through `draw` each render.
- **The modes' wording**: `joinGate`'s two sentences (456–458, 464) and
  `connect`'s one (485) are what `useFollow` shows as notices; extend-test
  reads them.

## 4. Risks, and what guards each piece

| Piece                     | Risk                                                                                                      | Guarded by                                                                                                                 |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `drawing-edits.ts`        | An off-by-one in `removeAt` or `addBeforeJoin`; a copied point breaking `joinRef`.                         | New `tests/unit/drawing-edits-test.mjs`; regression-gestures (29), hotspot-test (22: corners, never below three), extend-test (16: the join). |
| `restoredState`           | A pending stand-in restored as a plain segment but not re-asked; an area's runs asked.                     | New `tests/unit/draft-test.mjs`; hotspot-test and save-test ("draft reload", "undo to no points leaving no draft"); studio-scale-test. |
| `usePointBar`             | `canPutBack` losing the `controlPoints === deleted.after` identity check (694, 307).                       | studio-phone-test (38: Delete, Put back, the follow offer).                                                                |
| `useLineBorrowing`        | `freehandRef` read through a copy; `setBorrow` after `writeSegments` reordered.                             | extend-test (16), snap-test (20: U-turns at joins).                                                                        |
| The hook's wiring         | Effect order, a refs bundle re-created, an action losing `useCallback`.                                     | Every drawing suite; the cheap-phone budgets (studio-phone-test's "one router request on lifting").                        |
| The lint PR               | Splitting on top of the old ref mirroring, then merging #143.                                              | Branch from `staging` after #143 is in.                                                                                    |

**CI does not run the drawing suites on a pull request** (`ci.yml:85`,
README line 36–38): they run on a push to `staging`, nightly, or "Run
workflow". For this file and `use-draw-events.ts` the implementer runs the
six suites with `workflow_dispatch` on the branch before asking for review,
or locally where the router and the live tables are reachable, and quotes
the counts in the PR: group 3 (2 run, 1 SKIP), regression-gestures 29,
hotspot 22, snap 20, extend 16, studio-phone 38. The PR's own checks cover
save-test (84), studio-scale-test (13) and the unit tests (447 + the new
files).

New unit tests, under Node's runner with the TypeScript hook, in the style
of `places-test.mjs`:

- `tests/unit/drawing-edits-test.mjs`: `insertInGap` splits one gap into two
  straight ones and asks for both in the gap's own mode; `removeAt` at the
  first, last and a middle point (the middle heals into one gap asked for
  in the mode before, else after, else snapped); `addBeforeJoin` at join 0
  and mid-line, the join point the same object after; `ringSegments` of a
  four-corner ring is three straight segments; `waitingRuns` finds none,
  one, two separated runs and a run reaching the last gap.
- `tests/unit/draft-test.mjs`: `restoredState` strips `pending`, resolves
  the join index to the point, returns the pending runs, and none for an
  area; `readDraft` under a fake `localStorage` reads the stored words
  (`variantId`, `stopId`) into `directionId`, `hotspotId` and refuses a draft
  with no points — the contract pinned in a unit test for the first time.

## 5. The step order

Each commit builds, lints, and keeps every suite's count. Each could merge
alone.

1. `drawing-types.ts`: move the six types; point the five importers at it;
   `use-drawing.ts` re-exports nothing (the importers change, the hook's own
   uses become an import). Pure move.
2. `drawing-edits.ts` with its test; `addPoint`, `insertPoint`,
   `deletePoint`, `loadArea` call it. `waitingRuns` replaces the loop in
   `putBack`.
3. `restoredState` in `draft.ts` with `draft-test.mjs`; the restore effect
   calls it and `waitingRuns`.
4. `use-point-bar.ts`: move the state, the callbacks and the timer; the hook
   spreads what it returns into the API in the same positions.
5. `use-line-borrowing.ts`: move `keep`, `joinGate`, `connect`; fix the
   doubled JSDocs (337–342, 436–450) while they move, nothing else.
6. Tidy the header comment (22–29) to name the eight files, as stage 10a's
   did.

Run the drawing suites by `workflow_dispatch` after step 2 and after step 5
at least.

## 6. Model advice

**Fable 5.1.** The moves are mechanical but the file is a web of refs that
the map's handlers read between renders, two effect orders carry the draft
and the layers, and a lost `useCallback` dependency shows up only as a drag
that drops its point on a phone — which no PR check runs. Steps 1–3 are
plain enough for Opus 5.5; steps 4–5 want the model that reads the comments
at 129–130, 139–147 and 562–563 as rules.

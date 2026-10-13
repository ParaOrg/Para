# `src/app/studio/studio-app.tsx` — the plan

600 lines on `staging` at 6e718da. Stage 10b (PR #20, commit 390ac05) took
`useSaveTarget`, `useFollow`, `AccountPill`, `NewButtons` and `AuthDialogs`
out of a 640-line `StudioApp.tsx` and left 457; its follow-up (9096b51)
moved the hotspot menu's state back into the workshop after the ds-reviewer
found the split had changed what the owner saw. Since then the editor took
on the public map's cards and camera (2026-09-30 to 2026-10-13: `TripCard`,
`HotspotCard`, `RouteCardList`, `EndTitles`, `StationLabels`, `HintuanPin`,
`RouteExportPanel`, `SignboardEditor`), and the composition root is 600
again.

PR #143 (the studio's lint pass) edits this file: the `admitted` effect
(66–68) and the `signingIn` effect (192–194) become state set during
render, the `recovery.error` effect (201–203) becomes the toast's initial
state, and the timeline memo (167–177) reads two destructured members. The
split goes in after #143; the numbers below are today's.

## 1. What the file does today

| Lines   | Responsibility                                                                                                                                                                                                           |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1–48    | Imports: routes' cards, map and model by their concern folders; the studio through its `index.ts` (21–48), as the import rules ask.                                                                                      |
| 50–91   | `StudioApp`, the door: the session, the recovery link, "Loading…" while a session restores (71–77), `SignIn` (79–88), else the workshop.                                                                                 |
| 93–115  | `Workshop`'s own state: the map, the three dialog flags, `saving`, `hotspotMenu` (the workshop's on purpose, 9096b51), one toast of three kinds, `setNotice`, `justSaved`.                                                |
| 117–135 | The drawing, the saved routes and hotspots (hidden while drawn), the card stack.                                                                                                                                         |
| 136–154 | `useCardCamera`, with the owner's ask of 2026-09-30 quoted.                                                                                                                                                              |
| 156–158 | `useLitRides`.                                                                                                                                                                                                           |
| 160–177 | The open trip's timeline, a memo the comment calls load-bearing (160–165): the station dots hang on its identity.                                                                                                        |
| 179–184 | `routeCount`: routes, not directions (finding 7).                                                                                                                                                                        |
| 186–203 | `signedIn`, `userId`, the sign-in flag cleared on a session (finding 9), `resetting`, a rejected reset link as a notice.                                                                                                 |
| 205–215 | `useSaveTarget`, `useFollow`.                                                                                                                                                                                            |
| 217–225 | `onDone` (Done asks for sign-in or opens the panel), `editingHotspot`.                                                                                                                                                   |
| 227–245 | `onSaved`, `onSavedHotspot`: close, cancel the drawing, reload both (and why both: 231, 240–242), toast.                                                                                                                  |
| 247–279 | `onDeleteHotspot`: signed out asks for sign-in (248–254); a route's end refuses in a sentence (255–270, finding 15); confirm; delete; reload; errors as notices.                                                           |
| 281–291 | `cards`' members; `slotLeft`, whether the route just saved still has a direction to draw (283–286, review finding 2).                                                                                                    |
| 293–307 | `onDelete` for a direction, the same shape.                                                                                                                                                                              |
| 309–318 | The root (`@container`, `ref={root}`), `MapView`, the banner for a config or load problem.                                                                                                                                |
| 320–345 | The map's overlays while not drawing: `EndTitles`, `StationLabels`, `HintuanPin`, as `public-map-app.tsx` has them.                                                                                                      |
| 347–414 | `TripCard` with the editor's `extras` (371–412): `RouteFacts` with `CardActions` for the owner's own routes, `RouteExportPanel`, `SignboardEditor`.                                                                       |
| 416–468 | `HotspotCard`, after the trip on purpose (416–420: "the suites' first `card` is the trip"), with `CardActions` (the fly-to on Edit, 451–457).                                                                            |
| 470–490 | `RouteCardList`.                                                                                                                                                                                                         |
| 491–500 | `AccountPill` while nothing is open.                                                                                                                                                                                     |
| 502–537 | The three toasts: a hotspot saved, a route saved with "Draw the return trip" while a slot is left, a notice.                                                                                                              |
| 539–560 | `DrawToolbar` while drawing, else `NewButtons` unless the list is open (547–552, the owner's 2026-09-29).                                                                                                                |
| 562–569 | `AuthDialogs`.                                                                                                                                                                                                           |
| 571–597 | `HotspotPanel` or `SavePanel` while saving.                                                                                                                                                                              |

By CLAUDE.md, `app/` is "wiring only, no business logic". Lines 247–279 and
293–307 are business logic (who may delete what, and what to say), and
283–291 is a rule about routes. `Workshop` is also a second component in a
file that exports `StudioApp`, well past "a small private helper".

## 2. The split

### `app/studio/workshop.tsx` — `Workshop`

Lines 93–600, moved. `studio-app.tsx` keeps `StudioApp` (50–91) and imports
`Workshop` from `./workshop`. One exported component per file; the door and
the room each have one reason to change (the doc at 50–58 says they are
two things). The `Workshop` props type (97–100) becomes `WorkshopProps`.

### `features/studio/panels/trip-card-extras.tsx` — `TripCardExtras`

The `extras` node at 371–412: `RouteFacts` with its `CardActions`,
`RouteExportPanel`, `SignboardEditor`.

```tsx
interface TripCardExtrasProps {
  direction: DirectionRow;
  directions: DirectionRow[];
  hotspots: HotspotRow[];
  hotspotsAlong: (directionId: string, line: readonly LngLat[]) => Hotspot[]; // route-export-panel.tsx:29
  /** The editor's actions show only on the owner's own route. */
  isOwner: boolean;
  onEdit: () => void;
  /** Extend, offered only for a drawn direction (389–397). */
  onExtend?: () => void;
  onDelete: () => void;
  onSignboardsChanged: () => void;
}
export function TripCardExtras(props: TripCardExtrasProps): JSX.Element;
```

The workshop passes `isOwner={userId !== null && userId === v.ownerId}` and
the four handlers it already builds inline (380–397, 409). `TripCard`'s own
call (353–413) stays in the workshop: every other prop of it is camera and
ride wiring. Exported through `studio/index.ts`? No: it is rendered only by
the workshop, which is in `app/`, so yes, one line added to `index.ts`. The folder is `panels/`, where `RouteFacts`,
`CardActions`, `RouteExportPanel` and `SignboardEditor` already live.

### `features/studio/panels/save-toasts.tsx` — `SaveToasts`

Lines 502–537, the three toasts, as one component over the toast union:

```tsx
export type SaveToast =
  | { kind: 'route'; v: DirectionRow }
  | { kind: 'hotspot'; s: HotspotRow }
  | { kind: 'notice'; text: string };
interface SaveToastsProps {
  toast: SaveToast | null;
  /** Hidden while drawing, as the two saved toasts are today (502, 510); the notice shows regardless (533). */
  drawing: boolean;
  /** The route just saved still has a direction to draw: the toast offers it. */
  slotLeft: boolean;
  onDismiss: () => void;
  onDrawReturnTrip: (routeId: string) => void;
}
export function SaveToasts(props: SaveToastsProps): JSX.Element | null;
```

The union type (107–112) moves here from the `useState` generic; the
workshop keeps the state and `setNotice`. The button's `setToast(null)`
before `draw.start(routeId)` (519–520) stays in that order inside
`onDrawReturnTrip`'s caller. A story, `Features/Studio/SaveToasts`, with
the three kinds and the return-trip offer (PR #144 adds stories for the
siblings; this is the one it cannot, as the toasts are inline today).

### `features/studio/panels/return-trip.ts` — pure

```ts
/** After a save, the route still has a way undrawn: the direction just saved counts as drawn whatever the list says (283–291). */
export function returnTripLeft(justSaved: DirectionRow | null, directions: DirectionRow[]): boolean;
```

With `tests/unit/return-trip-test.mjs`: false with nothing saved; true when
the other direction's `shape` is null; false once it is drawn; false when
the list still shows the saved one as undrawn (`v.id !== justSaved.id`).

### `features/studio/panels/hotspot-in-use.ts` — pure

Lines 257–270:

```ts
/** The names of the routes that end at this hotspot, each once. */
export function routesEndingAt(hotspot: HotspotRow, directions: DirectionRow[]): string[];
/** Why the hotspot cannot go, in the words the toast shows (265–268), or null. */
export function endsRefusal(hotspot: HotspotRow, directions: DirectionRow[]): string | null;
```

With `tests/unit/hotspot-in-use-test.mjs`: one route ("ends", "that
route"), two routes ("end", "those routes"), a route listed twice by its two
directions counted once, none. save-test reads the sentence ("a route's end
refused a delete in words"), so the test pins its two shapes.

### `features/studio/panels/use-delete-actions.ts` — `useDeleteActions`

Lines 247–279 and 293–307:

```ts
export function useDeleteActions({
  signedIn,
  onSignInNeeded, // setSigningIn(true)
  saved, // { select, reload, directions }
  hotspots, // { select, reload }
  setNotice,
}: {...}): {
  onDelete: (v: DirectionRow) => Promise<void>;
  onDeleteHotspot: (s: HotspotRow) => Promise<void>;
};
```

`window.confirm` and its two sentences (271, 299) stay as they are, in the
hook. The refusal comes from `endsRefusal`. The hook takes the two saved
hooks' return types as `ReturnType<typeof useSavedRoutes>` picks, not the
whole objects, so a story-less hook still says what it reads.

Why a hook in `panels/` and not `data/`: it confirms with the user and
speaks in notices; the writes it calls are already `data/`'s
(`deleteDirection`, `deleteHotspot`).

### What stays in `workshop.tsx`

Everything that wires: the state, the hooks, `onDone`, `onSaved`,
`onSavedHotspot`, the overlays, the cards, the list, the pill, the toolbar,
the dialogs, the panels. About 420 lines, of which 250 are JSX passing the
hooks' results down. It is the composition root stage 10b chose to keep
("Workshop stays the composition root", 390ac05), and this plan keeps it:
one more hook, `useAuthDialogState` for 102–103, 186–203 and 217–220, would
take 35 lines and leave the `keys` prop at 543 reading from two places. Not
worth it; said here so no one adds it quietly.

## 3. What must not change

- **The DOM order of the cards.** `TripCard`, then `HotspotCard`, then
  `RouteCardList` (416–420: the suites' first `card` is the trip; group-test,
  save-test and visitor-test take `card` by testid). The toasts come after
  the pill and before the toolbar; `AuthDialogs` after; the panels last.
  `SaveToasts` renders its three in today's order (hotspot, route, notice).
- **The timeline memo** (160–177) and its dependency list. `StationLabels`'
  dots hang on `timeline.between`'s identity. It stays in the workshop,
  as the lint PR leaves it.
- **The hotspot menu's state** stays the workshop's (105, 555–556): 9096b51
  is the record of what happens when it moves.
- **Keys.** `TripCard` keyed on `saved.selected.routeId` (354: SWITCH keeps
  its colour), `HotspotCard` on the hotspot's id, `RouteCardList` on the
  choice's ids, `HintuanPin` on `ride.pickedId`.
- **The wording the suites read.** "Draw the return trip" (save-test),
  "is where … ends/end … Delete that route/those routes first" (save-test:
  the refusal), "Edit route", "Edit terminal", "Edit hintuan" (save-test,
  visitor-test), "Sign in to ParaPo Studio" and "Reset link problem"
  (gate-test, pwa-test), the `confirm` sentences. The strings move with
  their JSX, byte for byte.
- **Toasts, one at a time** (106): the state stays one value; `SaveToasts`
  is given it, never its own copy.
- **`onSaved`'s order** (227–234): close the panel, cancel the drawing,
  reload routes, reload hotspots, toast — and `onSavedHotspot`'s (236–245)
  with the directions reloaded too (finding 8). They stay in the workshop,
  unchanged.
- **The sign-in checks** before a delete (248–254, 294–298): a delete signed
  out opens the dialog and does nothing (review of 2026-10-03); the hook
  keeps both.
- **The fly-to on Edit** (451–458) stays inline in the workshop's
  `HotspotCard` `actions`: it needs `map`, and it is wiring.

## 4. Risks, and what guards each piece

| Piece                         | Risk                                                                                       | Guarded by                                                                                                        |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `workshop.tsx`                | A forgotten import; the door's `admitted` logic drifting during the move.                  | gate-test (15), pwa-test (43: the door renders); `npm run build` (the boundary check: `app/studio` imports the studio only through `index.ts`). |
| `TripCardExtras`              | The owner check applied to the wrong card; Extend offered for an undrawn direction.        | save-test (84: Edit route, Extend, Delete, the export, the signboards); visitor-test (no editor on `/`: the public page must not gain this chunk — check-build proves it). |
| `SaveToasts`                  | The return-trip button's order (`setToast(null)` then `draw.start`); the notice shown while drawing. | save-test ("the return trip offered while the slot is empty and written into it", "the saved toast inside the screen"). |
| `returnTripLeft`              | The `v.id !== justSaved.id` guard dropped (review finding 2).                              | New unit test; save-test (3): "+ New Route with the same ends fills the slot again".                              |
| `endsRefusal`, `useDeleteActions` | Singular and plural swapped; a delete signed out writing nothing and saying nothing.   | New unit test; save-test ("a route's end refused a delete in words", "a delete emptying the direction into a slot"). |
| The lint PR                   | Splitting before #143 lands, then merging two shapes of the same lines.                    | Branch after #143.                                                                                                |

The PR's own checks run save-test and studio-scale-test (the studio job)
and the public suites too, since `index.ts` changes and `src/features/studio/*`
counts as studio only; visitor-test's "no editor" check runs when the
public job runs. Nothing here needs the drawing suites, but a
`workflow_dispatch` before merge costs one run and confirms the toolbar's
`keys` prop still reaches it.

## 5. The step order

1. `workshop.tsx`: move `Workshop` and its imports; `studio-app.tsx` becomes
   the door alone. Pure move.
2. `return-trip.ts` with its test; the workshop calls it.
3. `hotspot-in-use.ts` with its test; `onDeleteHotspot` calls it.
4. `use-delete-actions.ts`: move both handlers; the workshop reads
   `onDelete` and `onDeleteHotspot` from it.
5. `save-toasts.tsx` with its story; the toast union moves with it.
6. `trip-card-extras.tsx` with its story (the owner's view and a visitor's,
   a drawn and an undrawn direction), exported from `index.ts`.

Steps 2–6 are independent of each other after step 1; each could merge
alone.

## 6. Model advice

**Opus 5.5.** Every move is a component or a function with a story or a
unit test to prove it, and the suites that read this screen run on the PR.
The three things to hold onto are listed in section 3: the DOM order, the
timeline memo and the hotspot menu's home. Ask the ds-reviewer agent to look
at `SaveToasts` and `TripCardExtras` before the push, as stage 10b did.

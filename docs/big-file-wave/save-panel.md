# `src/features/studio/panels/save-panel.tsx` — the plan

403 lines on `staging` at 6e718da. Stage 10c (PR #21, commits 29d14e3 and
2050a1d) took the places model (`places.ts`, pure, with `places-test`), the
derived facts (`useSaveFacts`), the save (`data/save-route.ts`) and the
notices (`SaveNotices`) out of a 592-line `SavePanel.tsx` and left 345. Then
stage 11 (b887b00) added Edit route's unlocked facts and the two refusals,
the phone layout went in (1ecc8b8, `sheet.ts`), and the train and ferry
lines locked the Mode (fa0f55f, 14b5f28).

No open PR touches this file. PR #144 adds `save-notices.stories.tsx`
beside it, no conflict.

## 1. What the file does today

| Lines   | Responsibility                                                                                                                                                                                                                               |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–20    | Imports: the timeline card, hotspots and routes models, `haversine`, the sibling places, notices, sheet classes, facts hook, `ENDS_TAKEN`, the save, the `Drawing` type.                                                                     |
| 22–45   | `Props`, each with its reason (`slotReversed` is never inferred from the line, 29–33).                                                                                                                                                       |
| 47–49   | `field`, the input's classes — written again in `hotspot-panel.tsx:33–35` without the `disabled:` pair.                                                                                                                                      |
| 51–68   | The doc (the two ends, not a name, since 2026-09-21) and the signature.                                                                                                                                                                      |
| 69–87   | The places, `placeOf`, and which end of the line is nearer the route's head (75–87): a picked end's box is looked for there, whichever way the line was drawn.                                                                                |
| 89–112  | The form's state: signboard, mode, fare note, via; the first guess at the ends (93–110: nearest box, its place, the place's box; swapped when the pair is already a route the other way round); head and tail.                               |
| 113–119 | `busy`, `error`, `written` (the row a save wrote before its link sync failed, finding 13).                                                                                                                                                   |
| 121–134 | `routeLocked` (a return trip and a retried new route keep the route's facts), `head`, `tail`, their places, `pickPlace`.                                                                                                                     |
| 136–163 | `useSaveFacts` and its eleven results.                                                                                                                                                                                                       |
| 165–217 | `submit`: four refusals in order (167–184: no end, same place, ends taken, turned round), then busy, the borrow on the full line, `saveRouteAndLinks` with the input built from the form (190–211), `onSaved`, errors as text.               |
| 219–250 | The overlay and the form; the heading by case (223); the points and km line with its two locked notes (225–230); `SaveNotices` with the wrong-way and borrow facts shaped for it.                                                            |
| 251–288 | Head and Tail: two identical `<select>`s over the places, `save-head` and `save-tail` (save-test's), each disabled while the route is locked.                                                                                                |
| 290–300 | The timeline preview (`save-timeline`): the hintuans the save will link, by the save's own rule.                                                                                                                                             |
| 302–311 | Via.                                                                                                                                                                                                                                         |
| 313–332 | What this line is: the direction (`save-direction`) of the route (`save-name`), and the sentence about generated names by case.                                                                                                              |
| 334–379 | Signboard, Mode (a line's mode locked, with its reason at 351–355; lines offered only when already the mode, 362), Fare note.                                                                                                                |
| 381–399 | The error line and the footer: Back to map, Save / Update / Saving….                                                                                                                                                                         |

The component is 345 lines of body for seven fields: the guess at the ends
and the refusals are logic a unit test could hold, and the two pickers and
the three fact fields are forms a story could show on their own.

## 2. The split

### `places.ts` gains the guess, pure

`places.ts` is "the places a route can end at, the box a place stands on"
(5–11), tested by `places-test.mjs`. The two rules at 75–87 and 97–110 are
its:

```ts
/** The line's ends by the route's head: [nearHead, nearTail], the head end being the one nearer `head` (75–87); a new route's line starts at its head. */
export function endsByHead(line: LngLat[], head: HotspotRow | undefined): [LngLat | undefined, LngLat | undefined];
/** The box a line end is guessed to stand at: the nearest box, its place, that place's own box (97–100); '' with no place. */
export function guessBox(places: Place[], hotspots: HotspotRow[], to: LngLat | undefined): string;
/** A new route's two ends from its line (104–110): swapped when that pair is already a route the other way round, whose head is where its jeeps wait. */
export function guessEnds(places: Place[], hotspots: HotspotRow[], line: LngLat[], directions: DirectionRow[]): [string, string];
```

`placeOf` (72) is `places.find(p => p.boxes.some(s => s.id === id))`, used
four times; it becomes `placeOfBox(places, id)` in the same file. The panel
calls `guessEnds` inside its `useState(() => …)` as today (104), so the
guess is still made once.

### `save-checks.ts` — the refusals, pure

Lines 167–184:

```ts
export interface SaveCheck {
  headId: string;
  tailId: string;
  /** The places of the two picked boxes, when known. */
  headPlace: Place | undefined;
  tailPlace: Place | undefined;
  endsTaken: boolean;
  turnedRound: boolean;
}
/** Why the save cannot go, in the panel's words, in the panel's order; null to proceed. */
export function saveRefusal(check: SaveCheck): string | null;
```

The four sentences move with it, `ENDS_TAKEN` still imported from
`../data/routes-write` (save-test reads it at 1256, and the swap's sentence
at 1266). With `tests/unit/save-checks-test.mjs`: the four cases in order,
and the order itself (no end beats same place beats taken beats turned).

### `place-picker.tsx` — `PlacePicker`

Lines 252–287, the two selects, one component:

```tsx
interface PlacePickerProps {
  label: string; // 'Head' | 'Tail'
  hint: string; // '(where the jeeps wait)' | '(the far end)'
  places: Place[];
  /** The picked place's key, '' for none. */
  value: string;
  disabled: boolean;
  onChange: (placeKey: string) => void;
  testId: 'save-head' | 'save-tail';
}
export function PlacePicker(props: PlacePickerProps): JSX.Element;
```

`required`, the "Pick a place…" option, the option order (`places.map`) and
the `data-testid` stay. The panel keeps `pickPlace` (131–134) and the
`nearHead`/`nearTail` it needs. A story, `Features/Studio/PlacePicker`:
empty, picked, disabled, many places.

### `route-fields.tsx` — `RouteFields`

Lines 336–379, the route's facts a save writes:

```tsx
interface RouteFieldsProps {
  signboard: string;
  mode: TransportMode;
  fareNote: string;
  /** The route's facts belong to the route: locked for a return trip and a retried new route. */
  locked: boolean;
  onSignboard: (v: string) => void;
  onMode: (v: TransportMode) => void;
  onFareNote: (v: string) => void;
}
export function RouteFields(props: RouteFieldsProps): JSX.Element;
```

The Mode's lock for a line and the comment at 351–355 move with it; the
`as TransportMode` at 359 stays (it is the one `as` in the file, on a select
whose options are `MODES`; the split is not the change to fix it). Story:
`Features/Studio/RouteFields`: a jeepney, a train (Mode locked), locked.

Via (302–311) stays in the panel: it sits between the pickers and the name
block, and its value feeds `useSaveFacts`.

### `sheet.ts` gains `FIELD`

Line 47–49's `field` becomes `FIELD` beside `FIELD_TEXT`, used by the panel,
`PlacePicker` and `RouteFields`. `hotspot-panel.tsx:33–35` keeps its own
until its own change: its classes differ (no `disabled:` pair), and this
split changes nothing there.

### `use-route-save.ts` — `useRouteSave`

Lines 113–119 (`busy`, `error`, `written`) and 185–216:

```ts
export function useRouteSave({
  facts, // useSaveFacts' result: borrowedForSave, borrowParent, borrowPart, reversed
  draw, // controlPoints, segments
  hotspots,
  onSaved,
}: {...}): {
  busy: boolean;
  error: string | null;
  setError: (e: string | null) => void;
  /** The row a save wrote before its link sync failed: the retry updates it (115–118). */
  written: { routeId: string; directionId: string } | null;
  save: (form: { routeId; directionId; writeRoute; signboard; mode; fareNote; headHotspotId; tailHotspotId; via }) => Promise<void>;
};
```

`save` does what 185–216 does: busy, clear the error, the borrow on the full
line, `saveRouteAndLinks(…, hotspots, setWritten)`, `onSaved`, or the error
and busy off. The panel's `submit` becomes: `preventDefault`, `saveRefusal`,
`setError` or `save(…)`. `routeLocked` (125) keeps reading `written` from
the hook.

### What stays in `save-panel.tsx`

Props and doc, the places and the guess (as calls), the form's six values,
`routeLocked`, `useSaveFacts`, `useRouteSave`, `submit`, and the JSX: the
heading, the summary line, `SaveNotices`, two `PlacePicker`s, the preview,
Via, the name block, `RouteFields`, the error and the footer. About 230
lines, a form of seven fields.

## 3. What must not change

- **Test ids**: `save-head`, `save-tail` (save-test), `save-timeline`,
  `save-direction`, `save-name` (no suite today; the stories' `within`
  queries may), and `SaveNotices`' `save-*` ids, untouched.
- **The refusals' order and words** (167–184): save-test reads two of them.
- **The guess is made once** (`useState(() => …)`, 104): a re-render must
  not re-guess over a hand-corrected end.
- **`firstGuess` reads the line's own order** (101–103), and `nearHead` /
  `nearTail` follow the route's head (75–87): `endsByHead` returns what the
  destructuring at 87 gives today.
- **The save input** (190–211), field by field: `routeId` from `written`
  first, `writeRoute: !!existing`, `borrowedFrom` null when the measured
  borrow is 0, `borrowedMetres` rounded.
- **`setError(null)` after `setBusy(true)`** (185–186) and `setBusy(false)`
  only in the catch (215): on success the panel unmounts.
- **The phone layout**: `OVERLAY`, `PANEL`, `FOOTER`, and every field
  `FIELD_TEXT` (save-test: "every field 16 px", "Save at its foot, above the
  home bar and over a keyboard"). `PlacePicker` and `RouteFields` use
  `FIELD`; the footer stays in the panel.
- **The Mode's options** (362): lines offered only as the current mode.
- **The locked notes** (225–230) and the name sentences (328–331), by case.
- **The stories** (`save-panel.stories.tsx`, 354 lines) fake a `Drawing`
  with four members (55–67) and drive the form with `userEvent`; they keep
  passing without edits, since the props and the ids do not change.

## 4. Risks, and what guards each piece

| Piece               | Risk                                                                               | Guarded by                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `places.ts` growth  | The swap rule or the head-side rule flipped.                                        | `places-test.mjs` (extended: `endsByHead` either way round; `guessEnds` plain, swapped, with no places); save-test (a route saved, the return trip's ends, Edit route). |
| `save-checks.ts`    | The order changed; a sentence changed.                                              | New `save-checks-test.mjs`; save-test (1255–1266: both refusals "writing nothing").                                                        |
| `PlacePicker`       | `required` or the testid lost; `value` keyed by box id instead of place key (257). | save-test (84); the panel's stories (the pickers are driven by `userEvent.selectOptions`); the new story.                                  |
| `RouteFields`       | The line lock dropped; the `MODES` filter reordered.                                | save-test (Edit route changes facts; the ferry and the train); the new story.                                                              |
| `useRouteSave`      | `written` not threaded back to `routeLocked`; `setBusy(false)` on success.          | save-test ("a failed link sync and a retry that updates, the new route's ends locked meanwhile").                                           |
| `FIELD` in sheet.ts | The hotspot panel changed by accident.                                              | `git diff` shows `hotspot-panel.tsx` untouched; save-test's hotspot save.                                                                  |

The PR's own checks run save-test (84) and studio-scale-test (13), the
suites this file answers to; nothing here needs the drawing suites.

New unit tests: `save-checks-test.mjs` (above), `places-test.mjs` extended
(`endsByHead`, `guessBox`, `guessEnds`, `placeOfBox`).

## 5. The step order

1. `places.ts`: `placeOfBox`, `endsByHead`, `guessBox`, `guessEnds`, with
   tests; the panel calls them. Pure move.
2. `save-checks.ts` with its test; `submit` calls `saveRefusal`.
3. `FIELD` in `sheet.ts`; the panel uses it (its own `field` deleted).
4. `place-picker.tsx` with its story; the two selects become two
   `PlacePicker`s.
5. `route-fields.tsx` with its story.
6. `use-route-save.ts`; `submit` shrinks to the refusal and the call.

Each step builds, lints, passes `npm run test:unit` and the stories build
(`npm run build-storybook`); save-test on the push. Run the ds-reviewer
agent on `PlacePicker` and `RouteFields` as stage 10c did on `SaveNotices`.

## 6. Model advice

**Opus 5.5.** The seams are the ones stage 10c cut, one layer further in;
every moved rule gets a unit test, every moved field a story, and save-test
runs on the PR. The two cautions are the once-only guess and the order of
the refusals, both in section 3.

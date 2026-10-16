# The big-file wave — the studio and shared

Five files, one plan each, written 2026-10-13 against `staging` at 6e718da
while the lint and stories passes were still open. The house method is
stage 10's (`docs/archive/plan-cleanup-2026-09-29.md`, PLAN.md's entry of
2026-09-29, PRs #18, #20–#27): one file a pull request, pure moves and
clear seams, the same behaviour, the suites' counts the same on every one,
and a unit test for what becomes pure. Every claim in the plans cites a
line of the file as it is today; the implementer re-anchors on the quoted
comments where an open PR has moved the lines.

| Plan                                       | Today | After (the file)   | New files                                                                                                                | New tests                                          |
| ------------------------------------------ | ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| [`use-drawing.md`](use-drawing.md)         | 703   | ~330               | `drawing-types.ts`, `drawing-edits.ts`, `use-point-bar.ts`, `use-line-borrowing.ts`; `draft.ts` gains `restoredState`   | `drawing-edits-test`, `draft-test`                 |
| [`use-draw-events.md`](use-draw-events.md) | 493   | ~140               | `draw-gestures.ts`, `draw-clicks.ts`, `draw-mouse.ts`, `draw-touch.ts`                                                   | `draw-gestures-test`                               |
| [`studio-app.md`](studio-app.md)           | 600   | ~45 + `workshop.tsx` ~420 | `workshop.tsx`, `trip-card-extras.tsx`, `save-toasts.tsx`, `return-trip.ts`, `hotspot-in-use.ts`, `use-delete-actions.ts` | `return-trip-test`, `hotspot-in-use-test`          |
| [`save-panel.md`](save-panel.md)           | 403   | ~230               | `save-checks.ts`, `place-picker.tsx`, `route-fields.tsx`, `use-route-save.ts`; `places.ts` and `sheet.ts` grow           | `save-checks-test`; `places-test` extended         |
| [`bottom-sheet.md`](bottom-sheet.md)       | 550   | ~260               | `sheet-room.ts`, `sheet-header.tsx`, `use-sheet-gestures.ts`; `sheet-gesture.ts` gains `measureSafeTop`                  | `sheet-room-test`                                  |

## Before any of them: the open PRs

Three pull requests into `staging` touch these files or their neighbours,
and the splits branch from `staging` after they merge:

- **#143 Lint pass — the studio** (`cleanup/lint-studio`) edits
  `studio-app.tsx` (two effects become state set during render, the reset
  link's notice becomes the toast's initial state, the timeline memo's
  dependencies) and `use-drawing.ts` (the ref mirroring becomes one
  `useLayoutEffect`; a disable comment on the draft restore). A split
  started before it lands would be merged against a different shape of the
  same lines. `use-drawing.md` and `studio-app.md` say where.
- **#144 Stories — the studio** adds stories beside `draw-toolbar`,
  `point-bar`, `save-notices`, `new-buttons`, `account-pill`, `route-facts`
  and the auth dialogs, and edits none of the five files. The split PRs
  add their own stories next to those; no conflict, but they should build
  on the merged tree so Storybook's build is one check.
- **#145 Stories — shared UI and the public map** adds
  `shared/ui/bottom-sheet.stories.tsx`. The sheet's split keeps that story
  passing and adds `sheet-header.stories.tsx`; branch after it.

Nothing else open (#133, #134) touches these files.

## The order, and why

1. **`save-panel.tsx`** first. No open PR touches it, its suite (save-test,
   84) runs on the pull request, and every seam is one stage 10c already
   cut a layer further out. A warm-up in the house method for the session
   that does it.
2. **`bottom-sheet.tsx`** next, after #145. The room's move changes three
   import lines in `features/routes/cards/` and nothing in the studio;
   phone-test and where-test run on the PR. Its one delicate step (the
   gesture hook) is last in its own plan and can wait for a review.
3. **`studio-app.tsx`**, after #143. Its pieces are components with stories
   and functions with tests; save-test and the public suites run on the PR.
4. **`use-drawing.ts`**, after #143. The one whose suites do not run on a
   pull request (below), and the one whose refs and effect order carry the
   most. Its first commit (`drawing-types.ts`) is the file the next split
   imports.
5. **`use-draw-events.ts`** last, after `use-drawing.ts` is in: its type
   imports move in that PR, and its `DrawRefs`/`DrawActions` are the bags
   `use-drawing.ts` builds. Its plan also offers a sound stopping point
   after two commits, if the night runs short.

## What can run in parallel

| Together                                                 | Why it is safe                                                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `save-panel` ∥ `bottom-sheet` ∥ `studio-app`              | Disjoint files: `panels/save-panel.tsx` and its new siblings; `shared/ui/` and three import lines in `routes/cards/`; `app/studio/` and `panels/` files `save-panel` does not touch. `studio-app` adds one line to `studio/index.ts`; `save-panel` adds none. Both add to `tests/unit/`, different files. |
| `use-drawing` ∥ `studio-app`                             | `use-drawing` stays inside `drawing/` (and `panels/new-buttons.tsx:1`, one import line); `studio-app` does not touch `drawing/`. `useDrawing`'s returned API does not change, so the workshop's reads of `draw.*` are untouched. |
| `use-drawing` ∥ `save-panel`                             | `save-panel` reads `Drawing['segments']` through `use-save-facts.ts` and the stories, by the unchanged type.                                      |

| Not together                                   | Why                                                                                                                                                      |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `use-drawing` then `use-draw-events`           | Shared call sites: `use-drawing.ts:603–633` builds the refs and actions `use-draw-events.ts` types at 57–80; `use-draw-events.ts:9` imports four types that `drawing-types.ts` takes over. Two PRs editing both sides would conflict on the same lines. |
| `bottom-sheet` after #145; `studio-app` and `use-drawing` after #143 | Above.                                                                                                                                                 |

## The drawing suites do not run on a pull request

`ci.yml:85` sets `drawing=false` for every pull request; the six drawing
suites (group, regression-gestures, hotspot, snap, extend, studio-phone)
run on a push to `staging`, nightly, or by "Run workflow". For
`use-drawing.ts` and `use-draw-events.ts` that means the suites that guard
the split run only after the merge, unless the implementer runs them: by
`workflow_dispatch` on the branch (one run, up to 40 minutes, one retry a
minute later for the shared router), or locally where the router, the tiles
and the live tables are reachable (the environment the review ran in denied
all three; a cloud session may too). Each of those two PRs quotes the six
counts in its body before asking for review: group 3 (2 run, 1 SKIP),
regression-gestures 29, hotspot 22, snap 20, extend 16, studio-phone 38.

## Model advice, in one place

| File                 | Model                                        | The reason                                                                                                   |
| -------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `save-panel.tsx`     | Opus 5.5                                     | Every move has a test or a story; save-test runs on the PR.                                                  |
| `bottom-sheet.tsx`   | Opus 5.5; Fable 5.1 for the gesture hook     | The room and the header are clean; the hook's behaviour is its listener options and cleanup order.           |
| `studio-app.tsx`     | Opus 5.5                                     | Components and functions; the three cautions (DOM order, the timeline memo, the menu's home) are written down. |
| `use-drawing.ts`     | Fable 5.1 (Opus 5.5 for the first three steps) | Refs read between renders, two load-bearing effect orders, stable callbacks the map's handlers depend on, and no PR check runs its suites. |
| `use-draw-events.ts` | Fable 5.1 (Opus 5.5 for the first two steps) | One effect of shared mutable locals and `performance.now()`; the finger's suite runs only by hand.           |

## Estimates

Per file, as one session's work: the commits, the local gate (`npm run
check`: format, lint, build with its guards, the unit tests; plus
`npm run build-storybook` where a story is added), and CI — about 15
minutes for the public job, up to 40 for the studio's, once per push; the
drawing suites by hand where needed.

| File                 | Commits | Pushes | Suites by hand           | Session time |
| -------------------- | ------- | ------ | ------------------------ | ------------ |
| `save-panel.tsx`     | 6       | 2      | none                     | 2–3 h        |
| `bottom-sheet.tsx`   | 5       | 2      | none                     | 3 h          |
| `studio-app.tsx`     | 6       | 2      | none (one dispatch, optional) | 3 h     |
| `use-drawing.ts`     | 6       | 2–3    | the six, twice           | 4–5 h        |
| `use-draw-events.ts` | 6       | 2      | the six, once            | 3–4 h        |

Three in parallel (save-panel, bottom-sheet, studio-app) are one night;
`use-drawing.ts` then `use-draw-events.ts` are a second. Stage 10 did seven
files in a night with the drawing suites running on every push; these
five need the dispatches, which is where the extra hours go.

## After the wave

Each PR appends a dated entry to PLAN.md in the house style and updates the
file's header comment to name its new siblings, as 1d281c4 and 390ac05 did.
Two things the plans noticed and left alone, for the owner's list:
`hotspot-panel.tsx:33–35` keeps its own `field` classes (one `disabled:`
pair short of the save panel's); and the "modes" hook `use-drawing.md`
declines would be one more pure move if 330 lines is still too many.

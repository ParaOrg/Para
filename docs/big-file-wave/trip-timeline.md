# `src/features/routes/cards/trip-timeline.tsx` — the plan

496 lines on 2026-10-13 (staging `6e718da`). A card component: the trip's rail
from where it leaves to where it goes, the fold, and the picked hintuan's pill.
No MapLibre, no effects, no data. The reason it is long is that the five rows
it is made of live in it, each with the owner's Figma notes.

## 1. What the file does today

| lines | what |
| --- | --- |
| 1–15 | Imports: `useState`, the two icons, the livery tokens of `livery-card.ts`, the `Livery` type. |
| 17–53 | `TripTimelineProps`, exported: `route-trip-detail.tsx:20` builds its own props from it with `Omit`. |
| 55–101 | The card's doc: the fold and its motion tokens, the pick rules, the dates of the owner's calls. |
| 102–210 | `TripTimeline`: the `open` and `everOpened` state (114–124, the cheap-phone plan's step 11), the rail and pressed classes (125–127), the card shell with its blob (130–145), the `<ol>` of rows (148–192), the hidden name that asks for the rows' font (193–203), the shadow (204–207). |
| 212–244 | `TimelineDot`, exported: the only piece the map imports (`map/hintuan-label.tsx:3,62`, `map/end-titles.tsx:14,238`). |
| 246–256 | `STICK`: the rail column's classes, with the owner's spacing note of 2026-10-13. |
| 258–297 | `TimelineTop`, private: `data-testid="trip-origin"`, `aria-pressed`. |
| 299–309 | `ROW_SHOWN` / `ROW_FOLDED`: a hintuan row's open and folded classes. |
| 311–405 | `TimelineHintuan`, private: `trip-hintuan`, `trip-hintuan-pick`, `trip-hintuan-fare`, `data-hintuan`, `data-state`, the pill's `data-part="code"` and `"pesos"`. |
| 407–450 | `TimelineDisclosure`, private: `trip-fold`, `aria-expanded`, the turning chevron. |
| 452–496 | `TimelineBottomEndRoute`, private: `trip-destination`, End's circled E. |

Its importers: `route-trip-detail.tsx:9` (`TripTimeline`, `TripTimelineProps`),
`trip-timeline.stories.tsx:4`, `map/hintuan-label.tsx:3` and
`map/end-titles.tsx:14` (`TimelineDot`), and `tests/unit/trip-timeline-test.mjs:30`,
which renders the component through Vite's SSR loader and compares the HTML.

## 2. The split

CLAUDE.md: one exported component per file, a small private helper may stay
beside it; props are an `interface` named `<Component>Props`. The rows are
four components of 40–95 lines each with their own test ids, so each gets a
file. Everything is a move; the one edit is naming each row's inline props
type as an interface, which the standards ask of a file that is substantially
edited.

| new file | takes | public surface |
| --- | --- | --- |
| `cards/timeline-dot.tsx` | 212–244 | `TimelineDot({ rail, selected = false, isTucked = true })`, `TimelineDotProps` (exported now; it was private). |
| `cards/timeline-stick.ts` | 246–256 | `STICK: string`, named for Figma's TimelineStick, which the comment already cites. Not a component: a `.ts`. |
| `cards/timeline-top.tsx` | 258–297 | `TimelineTop({ rail, pressed, routeOrigin, selected, onTap })`, `TimelineTopProps`. |
| `cards/timeline-hintuan.tsx` | 299–405 | `TimelineHintuan(...)`, `TimelineHintuanProps`; `ROW_SHOWN` and `ROW_FOLDED` stay private to it. |
| `cards/timeline-disclosure.tsx` | 407–450 | `TimelineDisclosure({ rail, pressed, open, count, onToggle })`, `TimelineDisclosureProps`. |
| `cards/timeline-bottom-end-route.tsx` | 452–496 | `TimelineBottomEndRoute(...)`, `TimelineBottomEndRouteProps`. |
| `cards/trip-timeline.tsx` keeps | 1–210 | `TripTimeline`, `TripTimelineProps`. About 215 lines with its imports, 47 of them the card's doc. |

Why these seams:

- `TimelineDot` is drawn in three places on the map (`end-titles.tsx:27-32`
  says so: "the hintuan's own … reusable"). A map file should import a dot,
  not the whole card. The map folder is the only MapLibre user, so the dot
  stays in `cards/` and the map imports it, as it does today.
- The rows are the owner's Timeline set (3716:1894), one Figma component
  each; the files mirror the set.
- `STICK` is read by all four rows, so it cannot stay private in any of them.

If the owner would rather have fewer files: move only the dot, the hintuan
row and the disclosure (the three with test ids beyond `data-state`), and keep
`TimelineTop` and `TimelineBottomEndRoute` private in `trip-timeline.tsx`. That
leaves it at about 310 lines. The plan above is the one that meets the rule.

## 3. What must not change

- Test ids, byte for byte: `trip`, `trip-origin`, `trip-hintuan`,
  `trip-hintuan-pick`, `trip-hintuan-fare`, `trip-fold`, `trip-destination`;
  the attributes `data-livery`, `data-hintuan`, `data-state`, `data-part`;
  `aria-pressed` on the three row buttons and `aria-expanded` on the fold.
  `trip-timeline-test.mjs` matches them with regular expressions, and
  phone-test (1094–1153, 1214, 1870, 3884), visitor-test and group-test
  (516–536) locate by them.
- Class strings, byte for byte. `trip-timeline-test.mjs:67-81` compares a
  row's whole `class` attribute to `FOLDED` and `SHOWN`, and line 105
  matches `min-w-0 flex-1 text-base/6 font-medium`. Prettier does not touch
  string contents, so a move is safe; a retype is not.
- The children's order inside the `<ol>` (148–192), the fold row kept in
  place whether open or not (comment 146–147), and the hidden font-asking
  `<span>` after the list (193–203).
- `setEverOpened(true)` in the same handler as `setOpen` (178–182): the
  first opening must move as every other.
- The list key `i + ':' + h.id` (158). It uses the index on purpose and
  CLAUDE.md asks for stable ids; do not "fix" it in a move. Note it for the
  owner as a question.
- No effects, no layers, no stable references to keep: the row callbacks are
  already new arrow functions each render.
- The cheap-phone budget this file carries is step 11: folded rows are bare
  `<li>`s until the fold is first opened. `trip-timeline-test` ("folded and
  never opened, every row is its bare `<li>`") and phone-test ("folded rows
  are drawn only once opened") hold it.

## 4. Risks and the nets

| risk | net |
| --- | --- |
| A row's markup drifts while it is retyped as an interface | `tests/unit/trip-timeline-test.mjs` (4 render checks: folded rows bare, the hidden name's weight, a lone hintuan drawn, a train's code in the pill). Run after each commit. |
| A test id or attribute lost | phone-test's fold and pick checks, visitor-test's trip card and picked hintuan, group-test's studio trip (516–536), save-test's trip card. |
| The map's imports of `TimelineDot` | `npm run typecheck` and `npm run build` (the boundary check runs in the build). where-test and visitor-test draw the end circles and the picked pin. |
| Stories | `trip-timeline.stories.tsx` is unchanged. Add `timeline-dot.stories.tsx` (rest, selected, untucked as the map draws it): the dot is now a component of its own with two states, which the standards say gets a story. Run the ds-reviewer on it, as Stage 10 did for `TripTimeline`'s stories. |
| Lint, tonight's pass | The four lint sessions may touch this file. Rebase the split on their merged PRs before starting. |

Nothing becomes pure: there is no logic to lift out, so no new unit test. The
count stays at today's 459.

## 5. Step order

One pull request, four commits, each green on its own:

1. `timeline-dot.tsx` out; `hintuan-label.tsx`, `end-titles.tsx` and
   `trip-timeline.tsx` import it from there. Typecheck, lint, unit, build.
2. `timeline-stick.ts` and `timeline-hintuan.tsx` out (the row and its two
   class constants).
3. `timeline-disclosure.tsx`, `timeline-top.tsx`, `timeline-bottom-end-route.tsx`
   out.
4. `timeline-dot.stories.tsx`; `npm run build-storybook`; ds-reviewer.

Then the public suites that read the card: visitor-test, phone-test, and
group-test for the studio's copy (a PR under `src/features/routes/` runs both
CI jobs).

## 6. Model advice

Straightforward: Opus 5.5. Pure moves of JSX, held by one unit test that
compares HTML and by three suites that locate by test id.

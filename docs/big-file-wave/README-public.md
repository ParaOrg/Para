# The big-file wave — routes, locator and the public map

Written 2026-10-13 on staging `6e718da`, while the lint pass runs in other
sessions. Plans only: nothing under `src/` changed with this document. The
studio's files have their own `README.md` in this folder, from another
session. The splits are for later sessions on Opus 5.5, one file a pull
request, after tonight's pull requests merge.

The method is Stage 10's (`docs/plan-cleanup-2026-09-29.md`, and the
commits `git log --oneline --grep "Stage 10"` once the clone is deepened):
pure moves and clear seams, the same behaviour, the same suite counts in the
PR body, and a unit test for whatever becomes pure. PR #18's body is the
house format for the counts table.

## The seven plans

| file | lines | plan | PRs | new files | becomes pure (new tests) | model |
| --- | --- | --- | --- | --- | --- | --- |
| `features/routes/cards/trip-timeline.tsx` | 496 | [trip-timeline.md](trip-timeline.md) | 1 | 6 (+1 story) | nothing | Opus 5.5 |
| `features/routes/map/map-view.tsx` | 464 | [map-view.md](map-view.md) | 1 | 4 | the controls, the trace, the DOM line (2 test files) | Opus 5.5, pin list in hand |
| `features/locator/use-locator.ts` | 464 | [use-locator.md](use-locator.md) | 1 | 3 | `fixFrom`, `visitorCamera` (~8 tests) | Opus 5.5; commit 4 read once |
| `features/routes/map/saved-hotspots-layers.ts` | 457 | [saved-hotspots-layers.md](saved-hotspots-layers.md) | 1 | 3 | the hatch (1 test file) | Opus 5.5 |
| `features/routes/map/saved-routes-layers.ts` | 442 | [saved-routes-layers.md](saved-routes-layers.md) | 1 | 3 | nothing (already tested) | Opus 5.5 |
| `features/routes/map/direction-arrows.ts` | 440 | [direction-arrows.md](direction-arrows.md) | 1 (+1 optional) | 2 (+1) | `rideEnds` (1 test file); the pacer (+1) | Opus 5.5; the pacer Fable 5.1 |
| `app/public-map/public-map-app.tsx` | 354 | [public-map-app.md](public-map-app.md) | 1 | 2 (+1) | nothing | Opus 5.5 |

Baseline today: `npm run test:unit` is 459 tests in 50 files (the suites'
README says 447 in 46; it is a day behind). The headless counts to quote are
the README's: visitor 2239, phone 136 (133 run), where 49, scale 7, pwa 43,
gate 15, group 3 (2 run), studio-scale 13, save 84.

## The order, and why

1. **use-locator** — its importers are all inside `features/locator/`; a PR
   there alone runs only the public CI job, and where-test is its one net.
   Nothing else in the wave touches the locator.
2. **trip-timeline** — pure JSX, one unit test that compares HTML. It
   changes two import lines in `map/end-titles.tsx` and `map/hintuan-label.tsx`.
3. **saved-hotspots-layers** — one importer (`use-saved-hotspots.ts`) and
   four unit tests' import blocks.
4. **saved-routes-layers** — after 3, because both PRs edit the same import
   blocks of `map-sources-test.mjs`, `gl-programs-test.mjs` and
   `layer-switch-test.mjs`, and `gl-programs-test` reads this file by text.
   Its lighting move also touches `pass-stretches.ts` and `use-card-stack.ts`.
5. **direction-arrows** — after 2 and 4: its `Ride` move edits
   `end-titles.tsx` (as 2 did) and `use-card-stack.ts` (as 4 did), on the
   lines next to theirs. The pacer, if wanted, is a second PR after it.
6. **map-view** — independent of 1–5 in source, but it is the file the lint
   pass is likeliest to touch (its `[]` deps at 406) and six unit tests pin
   its text, so it goes after the lint PRs are in and the tree is quiet.
7. **public-map-app** — last: two of its three moves edit `studio-app.tsx`,
   which the studio wave is splitting, and one waits on PR #133 (the
   iPhone install offer, a draft).

## What can run in parallel

| at once | why they do not collide |
| --- | --- |
| 1 use-locator, 2 trip-timeline, 3 saved-hotspots-layers | Disjoint source files and disjoint test files. Three sessions can start together. |
| 6 map-view with any of 1–3 | It touches only `map-view.tsx` and new files; nothing else in the wave imports from it, and it imports `routesDrawn` from a line 4 leaves alone. |

| not at once | the shared call site |
| --- | --- |
| 3 and 4 | `tests/unit/map-sources-test.mjs:21-30`, `gl-programs-test.mjs:28-35`, `layer-switch-test.mjs:11-12`: adjacent import lines. |
| 4 and 5 | `cards/use-card-stack.ts:9,11`: `useRideColours` and `useLitLineColour` move to new files in different PRs. |
| 2 and 5 | `map/end-titles.tsx:7,14`: `rideEnds`/`Ride` and `TimelineDot` move in different PRs. |
| 7 and the studio wave | `app/studio/studio-app.tsx`: the timeline memo (166–176) and the overlays (321–345) come out in 7, and the studio README splits the file. |
| everything and tonight's lint pass | At the time of writing no open PR into staging (#143 lint-studio, #144, #145 stories, #134, #133) touches any of the seven files; the sessions' branches may not be pushed yet. Each split starts from a fresh `staging` after they merge. |

The second-order rule: a PR that lands first changes the line numbers the
later plan cites. The seams are named by content as well as by line, so the
later session re-reads the file and takes the names.

## Estimates

Session time, with the fast checks after each commit (`npm run typecheck`,
`lint`, `test:unit`, `build`, about four minutes together) and one local run
of the suite that matters; CI adds up to 15 minutes for the build job and up
to 30 for the public suites, in parallel.

| plan | commits | session time | local suite to run first |
| --- | --- | --- | --- |
| use-locator | 4 | 2 h | where-test (`PARAPO_NO_TILES=1` where tiles are blocked) |
| trip-timeline | 4 | 1.5 h | phone-test's fold and pick, or visitor-test one part |
| saved-hotspots-layers | 4 | 2 h | map-sources, gl-programs, layer-switch, map-style (unit); then phone-test |
| saved-routes-layers | 3 | 2.5 h | the same unit four; then scale-test (budgets) |
| direction-arrows PR 1 | 2 | 1.5 h | chevrons-test; visitor-test's chevron part |
| direction-arrows PR 2 (optional) | 1 | 3 h, Fable 5.1 | visitor-test 1251–1307 before and after |
| map-view | 4 | 2 h | framing, loading-screen, early-start, maplibre-worker, tiles-asked, map-style (unit); then phone-test and pwa-test |
| public-map-app | 3 | 2 h | commit-turn-test; visitor-test one part; group-test |

About 14 hours without the pacer, 17 with it; three nights at the three
parallel starts, or two if 6 runs beside them.

## What every PR carries

- The PR body in #18's shape: what moved where with line counts, what is
  unchanged (ids, test ids, the returned API), the counts table before and
  after, `npm run check` and `npm run build-storybook` passing.
- Importers rewritten name by name, never a re-export left behind
  (CLAUDE.md: barrels only at the three leaf features' roots).
- Comments that name a file by its old name updated in the same commit (the
  plans list them: `looks.mjs:15`, `layer-switch.ts:16`,
  `saved-hotspots-layers.ts:301`, `framing.ts:200`, where-test's header).
- Nothing disabled, skipped or quarantined to go green; a count that drops
  is a finding, not a flake.

## What this wave leaves alone, on purpose

- `coarse` and `APP_MOVE` stay in `map-view.tsx` (nine importers, four of
  them studio files in flight). `tap.ts` and `framing.ts` are their natural
  homes if the owner wants that later.
- `map-view.tsx`'s one effect stays one effect. A hook that owns the map's
  state would be a rewrite of a closure five unit tests read by text.
- `trip-timeline.tsx`'s list key `i + ':' + h.id` (158) is left as it is and
  noted for the owner: CLAUDE.md asks for stable ids.

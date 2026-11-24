# Folder restructure and branch tidy: the plan

Step 1 only. Nothing was moved, deleted or closed. Written 2026-11-21 against `origin/staging` at `0f610666`, after `git fetch --prune`.

Nothing here starts until the owner says OK. The CI speed audit asked for alongside this is in `.scratch/ci-speed/phase-2-plan.md`.

## Outcome (2026-11-21)

The owner said OK to the branch list, to batches 1 to 4, and to decisions D1 to D6 "as recommended". What was done the same day:

**Folders**

| Batch | Pull request | What moved |
| --- | --- | --- |
| 1 | #1109, merged | `contribute/common/use-focus-heading.ts` removed; `history-screen.tsx` imports the shared hook |
| 2 | #1110, merged | `routes/map/hotspot-taps.ts` → `use-hotspot-taps.ts`, `route-taps.ts` → `use-route-taps.ts` |
| 3 | #1111, merged | `studio/drawing/gap-resolver.ts` → `use-gap-resolver.ts` |
| 4 | #1112, merged | `fonts/Livvic/` → `fonts/livvic/` with its ten files lower-cased, `fonts/Cubao/` → `fonts/cubao/`; one hash in `public/_headers` follows, because `index.html`'s inline style names the font |

Still WAIT: batches 5 and 6 (`shared/ui/sheet-room.ts`, `shared/ui/sheet-header.tsx`), for the design session on the bottom sheet. D1 to D6: the code stays, and CLAUDE.md says so (edits E1 to E10, in a pull request of their own). D6's look-alikes have no tickets yet.

**Branches:** 444 of 571 deleted, one `git push origin --delete` each, none refused. The 420 of list 1, the heads of #977, #993 and #462 once closed, and 21 of list 3 the owner left to this session. Every tip is in `Downloads/deleted-branches-2026-11-21.txt` on the owner's machine, with the 35 unmerged ones in a bundle beside it.

**Pull requests closed:** #977, #993, #462, #364, #133. The branches of #364 and #133 are kept: their content is not on staging.

**Kept from list 3:** `studio-plan`, the five `claude/go-here-*` branches, `claude/route-end-indexes`, and the four screenshot branches.

**Found on the way, for tickets:** on the owner's Windows machine `tests/unit/contribute-css-sources-test.mjs` fails 2 tests on unchanged staging (it compares `/` paths with `\`), a worktree under `.claude/worktrees/` fails 29 more (React loads twice) and reddens lint and format in the main checkout, and phone-test's "a tap reaches … (Close|Back)" check fails now and then on unchanged staging. None fails in CI. The first two are item 11 of `.scratch/ci-speed/phase-2-plan.md`; the phone-test one has no ticket yet.

The lists below are the plan as it was written, before any of this.

## How it was checked

- Every tracked file under `src/` (1,163) was walked by script: each path segment against kebab-case, every `import`, `export … from`, `import()`, CSS `@import` and `new URL(…, import.meta.url)` resolved to the file it points at, from `src/` and from `tests/`, `scripts/`, `.storybook/`, `workers/` and the root configs (1,531 importing files, 4,397 imports).
- "Importers" below counts files that import the item, tests and scripts included. "Named in" counts other files that name its path as text (a check's list, a doc, a comment).
- Open pull requests checked for overlap, all 17: #133, #364, #462, #637, #672, #877, #903, #909, #914, #922, #977, #992, #993, #1007, #1008, #1009, #1010. Those that touch `src/`: #133 (published-map, routes/cards, routes/map, design-system, app/public-map), #462 (studio/review, a folder that no longer exists), #877 (routes/published), #903 (routes/model), #914 (studio/reports, a new folder), #1007 (contribute/history stories, recorder, uploads).

## A. Folders

### What already matches

Most of the tree does, because ESLint already fails the build on it.

| Check | Result |
| --- | --- |
| `shared/` importing `features/`, `app/` or `pages/` | 0 |
| A feature importing another (other than `routes`) | 0 |
| Deep imports past `locator`, `published-map`, `studio` or `contribute`'s `index.ts` | 0 |
| Anything importing from `app/` | 0 |
| Relative imports that leave their feature (TypeScript) | 0 |
| Barrels outside the four allowed | 0. The only `index.ts` files are the four leaf features' |
| Empty folders | 0 |
| Identical files | 0 |
| `.ts` / `.tsx` / `.css` names that are not kebab-case | 0 |

So the list of real mismatches is short.

### Findings

| # | Now | Should be | Why (CLAUDE.md) | Importers | Risk |
| --- | --- | --- | --- | --- | --- |
| F1 | `src/features/contribute/common/use-focus-heading.ts`, a one-line re-export of `@/shared/hooks/use-focus-heading` | Gone. `contribute/history/history-screen.tsx` imports the shared hook, as the 17 other contribute files do | "Before creating a component, hook or util, check `src/shared/`"; "Don't create barrels in other folders." The file's own TODO says to delete it once history imports the hook | 1 | Very low |
| F2 | `src/features/routes/map/hotspot-taps.ts` (exports only `useHotspotTaps`) | `use-hotspot-taps.ts` | "Hook file / hook: `use-x.ts` / `useX`" | 1 | Low |
| F3 | `src/features/routes/map/route-taps.ts` (exports only `useRouteTaps`) | `use-route-taps.ts` | Same | 1; named in a comment in `tests/e2e/phone-test.mjs` | Low |
| F4 | `src/features/studio/drawing/gap-resolver.ts` (exports only `useGapResolver`) | `use-gap-resolver.ts` | Same | 1 | Low |
| F5 | `src/design-system/foundation/fonts/Livvic/` and its ten `Livvic-*.ttf` / `.woff2` files; `fonts/Cubao/` | `fonts/livvic/livvic-regular.woff2` and so on; `fonts/cubao/` | "Files and folders: kebab-case." ESLint misses these: its name rule reads `.ts`, `.tsx` and `.css` only | `fonts.css` (5 `url()`), `index.html` (2), `subset.sh` (1), the fonts' `README.md`, `tests/unit/architecture-test.mjs` (1 fixture path), `.claude/skills/tidy/keep.md` (1) | Medium. The built font files take new names, so a returning commuter's phone fetches the five fonts once more. `index.html` preloads one by path, and the build's font budget and the offline worker's list must still pass. A case-only folder rename on Windows needs two `git mv` steps |
| F6 | `src/shared/ui/sheet-room.ts` | `src/features/routes/map/sheet-room.ts` | "shared/: Used by 2+ features." Only routes uses it (4 files in `routes/map`) | 5 (4 + `tests/unit/sheet-room-test.mjs`); named in `scripts/checks/long-files-baseline.json` | Low, but **WAIT** |
| F7 | `src/shared/ui/sheet-header.tsx` (+ its story) | `src/features/studio/panels/` | Same rule. Only the studio uses it (`hotspot-card.tsx`) | 3 | **WAIT**, and not a plain move: `shared/ui/bottom-sheet.stories.tsx` imports it, and a shared story may not import a feature |

**WAIT** (the owner's design session is working there, or an open PR touches it):

- F6 and F7. They are not named `bottom-sheet*`, but they are the bottom sheet's own parts, and `bottom-sheet.stories.tsx` imports one of them. Treated as inside the fence.
- Everything in `src/features/routes/cards/` (89 files). Nothing there needs a move by the checks above. One look-alike sits in it (`fareFor`, see below).
- `src/features/published-map/install-offer.ts`, `install-prompt.tsx`, `index.ts`: touched by open PR #133. Only matters for decision D5.

### Checked and found right, though a first look says otherwise

- `shared/hooks/use-focus-heading.ts` has 17 importers in contribute and none in another feature, but `shared/ui/page-error-screen.tsx` uses it, and shared cannot import a feature. It stays.
- `shared/ui/toast-host.tsx`, `toast-queue.ts`, `use-toast.ts`: contribute imports them directly, and the public map and the studio reach them through `shared/ui/standing-toasts.tsx`. Three users. They stay.
- `shared/utils/css-duration.ts`: contribute, and routes through `shared/utils/motion.ts`. Stays.
- `shared/config/basemap-host.ts`: only routes among the features, but `vite.config.ts`, `vite.apk.config.ts`, `shared/config/env.ts` and the build guards read it. Stays.
- `shared/config/basemap-cache-rules.ts`: contribute, and the public map's offline worker through `scripts/node/basemap-offline.ts`. Stays.
- `routes/map/basemap-thumbnails/` (3 pictures) and `studio/drawing/basemap-thumbnails/` (2): small, but CLAUDE.md says "Today a feature keeps its own beside its code."
- The Cubao fonts are imported by nothing. The fonts' README says so on purpose ("Unwired … until a design"). They stay.

### Batches

One purpose and one PR each, into `staging`, safest first. One in CI at a time; the next starts when staging is green after the merge.

| Batch | Moves | Imports changed | Also updated | Suites beyond `npm run check` and `npm run build-storybook` |
| --- | --- | --- | --- | --- |
| 1 | F1: delete the re-export | 1 (`history-screen.tsx`) | Nothing | `contribute-test`, `profile-test` |
| 2 | F2, F3: the two routes/map hook files | 2 | The comment in `tests/e2e/phone-test.mjs` that names `route-taps`; `docs/architecture.md` if `npm run docs:architecture:check` asks | `commuter-test`, `phone-test`, `hotspot-test` |
| 3 | F4: the studio hook file | 1 | Same doc check | `snap-test`, `extend-test`, `save-test` |
| 4 | F5: fonts to kebab-case | 0 TypeScript imports; 5 `url()` in `fonts.css`, 2 paths in `index.html` | `subset.sh`, the fonts' `README.md`, the fixture path in `architecture-test.mjs`, `keep.md` | `pwa-test`, `commuter-test`, `contribute-test`; plus a before/after list of the font files in `dist/` in the PR |
| 5 (WAIT) | F6: `sheet-room.ts` into `routes/map` | 4 + 1 test | `long-files-baseline.json` path | `commuter-test`, `phone-test` |
| 6 (WAIT) | F7: `sheet-header.tsx` into `studio/panels`, story title `Shared/UI/SheetHeader` → `Features/Studio/SheetHeader` | 3 | Needs the bottom sheet's story to stop importing it first, which is a code edit and the design session's file | `studio-phone-test`, `hotspot-test` |

Notes on the batches:

- Batch 2 and 3 are one purpose but two areas (`areas.json`: shared and studio), so they are two PRs, as "a pull request stays in one area where it can".
- Batch 4 spans two areas whatever is done (`src/design-system/` is shared, `index.html` is commuter). CI will warn; the PR will say why.
- Batch 4 changes the Livvic files the redesign added on 2026-11-19. It is not in the WAIT list, but it should go only when the design session is not adding or re-subsetting fonts.
- The suites are my pick from what each file drives; CI runs every suite on the PR regardless. Locally they run two at a time at most, on a dev server of their own port, with every non-local request refused and the refused hosts printed.

### Decisions for the owner (no batch until answered)

Each of these is a place where CLAUDE.md is unclear or where following it to the letter means a large move. My recommendation is first.

| # | The case | Options |
| --- | --- | --- |
| D1 | `locator` (29 files) and `published-map` (14 files) are flat. CLAUDE.md: "The kind folders (`components`, `hooks`, `api`, `schemas`, `utils`) are the default for a small feature." | **Keep flat and say so in CLAUDE.md (edit E5).** Half of locator's files are rules (`locator-mood.ts`, `last-known.ts`, `where-told.ts`) that fit none of the kind folders without inventing one. Or: move them into `components/`, `hooks/` and `utils/`, about 43 files in two PRs, medium risk |
| D2 | Seven concern folders are large and flat: `routes/map` 121 files, `studio/panels` 91, `routes/cards` 89 (WAIT), `contribute/account` 67, `studio/data` 57, `studio/drawing` 54, `contribute/api` 52. CLAUDE.md: kind folders "appear inside a concern folder when it grows", with no number | **Leave them, and give the rule a number (edit E8).** Splitting `routes/map` alone changes about 400 import lines and the paths in dozens of unit checks, while #133 and the design session are in it |
| D3 | `contribute` has 19 folders. CLAUDE.md names one (`api/`). `common/` (17 files) is neither a kind nor a concern; `screens/` (42) is a kind among concerns | **List contribute's folders in CLAUDE.md and name `common/` as the feature's own shared code (edit E2).** Or: tell me which concern each `common/` file belongs to |
| D4 | `app/public-map/` holds `contribution-card.tsx`, `page-toasts.tsx`, `place-search-bar.tsx`; `app/studio/` holds ten files (`workshop.tsx` is 386 lines, `public-map-app.tsx` 477). CLAUDE.md: "App shells. Wiring only", and names three files | **Leave them and widen the comment (edit E7):** they join several features, which only a shell may do. `contribution-card.tsx`, `place-search-bar.tsx` and `status-bar.ts` import routes alone and could move into `routes/` (cards is WAIT); `account-dialogs.tsx` and `other-maps.tsx` import the studio alone |
| D5 | 20 more files export a hook and are not named `use-x.ts`, because each also exports the plain rules the hook reads: `routes/map/layers.ts` (7 exports, 22 importers), `direction-arrows.ts` (10), `studio/drawing/draw-layers.ts` (17), `locator/dot-gaze.ts` (10), `published-map/status.ts`, `pwa.ts`, `install-offer.ts`, `shared/hooks/commit-turn.ts` and 12 others | **Keep their names and say so in CLAUDE.md (edit E4).** Renaming them `use-…` would misname the rules inside; splitting them is a code change, not a move |
| D6 | Look-alikes that a move cannot fix, each needing a code change of its own: `use-captcha.ts` in `contribute/account` and in `studio/auth` (25 lines differ); `para-logo.svg` in the same two folders (the files differ); two components called `Toast` (`studio/panels/toast.tsx`, `shared/ui/toast.tsx`); `ChevronDownIcon`, `LocationIcon`, `CheckIcon`, `AddIcon` each drawn twice; `fareFor` in `routes/cards/trip-facts.ts` and `routes/model/fares.ts`; `MODE_LABEL` in contribute and in routes/cards | **A ticket each, outside this work.** Say which you want and I will write them |

### CLAUDE.md edits proposed

None is made. Each is one or two lines.

| # | Edit | Why |
| --- | --- | --- |
| E1 | Folder tree, studio: `auth/ data/ drawing/ panels/` becomes `auth/ contributors/ data/ drawing/ maps/ panels/ public-view/`; the same list in the "large feature" paragraph | Three folders exist that the file does not name |
| E2 | Folder tree, contribute: list its concern folders, and say `common/` is code several of them share | Depends on D3 |
| E3 | Naming: "`README.md` and a licence's own file (`OFL.txt`) keep their names. `database.types.ts` keeps the name Supabase's generator gives it." | The suffix rule ("the only extra file-name suffixes allowed are `.stories.tsx` and `.d.ts`") contradicts the file CLAUDE.md itself names in TypeScript |
| E4 | Naming: "A file whose only export is a hook is `use-x.ts`. A file that exports a hook beside the rules it reads is named for what it is about." | Depends on D5 |
| E5 | Folder structure: "A small feature may stay flat until about 30 files." | Depends on D1 |
| E6 | Folder tree: `styles/global.css` becomes `styles/` with `global.css` and `map-frame.css` | The second file exists |
| E7 | Folder tree, `app/`: "Wiring, and the parts only that page draws that join several features." | Depends on D4 |
| E8 | "appear inside a concern folder when it grows" gets a number, or a line saying a split is by sub-concern, not by kind | Depends on D2 |
| E9 | Imports and exports example: `import { useRoutesQuery } from '@/features/routes';` | It shows the import the file forbids two sections earlier ("routes has no `index.ts`") |
| E10 | Formatting and linting: note that the kebab-case rule reads `.ts`, `.tsx` and `.css` only, or widen the rule's glob to every file under `src/` (an `eslint.config.js` change, after batch 4) | How F5 got in |

## B. Branches

571 branches on `origin` after the prune. No fork is in any list: the five open PRs from `smmariquit/Para` (#877, #1007, #1008, #1009, #1010) live on that fork and are not touched.

"Touched in the last 7 days" means a last commit on or after 2026-11-14.

### 1. Safe to delete (420)

Merged into staging, or the PR is merged or closed, and no commit since 2026-11-13. Two of them are yours by name and are newer than that: `claude/deps-tooling-vite-824` and `claude/probe-sheet-drag`.

**Read these 13 first.** They are in the list by your rule, but they are not plain "merged into staging" branches:

| Branch | Last commit | Merged into staging | PR | |
| --- | --- | --- | --- | --- |
| `claude/apk-spike` | 2026-10-24 | no | #385 closed | PR closed without merging: its commits are NOT in staging |
| `docs/public-page-data-exception` | 2026-11-04 | no | #690 merged | PR merged (tip not an ancestor of staging: squash or later history) |
| `fix/page-error-boundaries` | 2026-11-04 | no | #693 merged | PR merged (tip not an ancestor of staging: squash or later history) |
| `lint/core-purity` | 2026-11-04 | no | #689 merged | PR merged (tip not an ancestor of staging: squash or later history) |
| `basemap-violet-3` | 2026-11-05 | no | #766 closed | PR closed without merging: its commits are NOT in staging |
| `claude/studio-sidebar-drop-boxes` | 2026-11-05 | yes | none | merged into staging |
| `docs/attach-spec` | 2026-11-05 | no | #771 merged | PR merged (tip not an ancestor of staging: squash or later history) |
| `docs/record-delete-account-migrations` | 2026-11-05 | no | #721 merged | PR merged (tip not an ancestor of staging: squash or later history) |
| `claude/contributor-route-colours` | 2026-11-06 | no | #824 closed | PR closed without merging: its commits are NOT in staging |
| `claude/apk-battery-unrestricted` | 2026-11-08 | no | #844 merged | PR merged (tip not an ancestor of staging: squash or later history) |
| `claude/apk-drop-geolocation-plugin` | 2026-11-10 | no | #795 merged | PR merged (tip not an ancestor of staging: squash or later history) |
| `claude/deps-tooling-vite-824` | 2026-11-14 | yes | none | merged into staging; yours by name |
| `claude/probe-sheet-drag` | 2026-11-16 | no | #1012 closed | PR closed without merging: its commits are NOT in staging; yours by name |

**The whole list:**

| Branch | Last commit | Merged into staging | PR | |
| --- | --- | --- | --- | --- |
| `claude/apk-spike` | 2026-10-24 | no | #385 closed | |
| `claude/cleanup-1029-c1` | 2026-10-29 | yes | #515 merged | |
| `claude/cleanup-1029-c2` | 2026-10-29 | yes | #521 merged | |
| `claude/cleanup-1029-s1-flags` | 2026-10-29 | yes | #517 merged | |
| `claude/cleanup-1029-s3-workshop` | 2026-10-29 | yes | #519 merged | |
| `claude/cleanup-1029-t1` | 2026-10-29 | yes | #516 merged | |
| `claude/cleanup-1029-t2` | 2026-10-29 | yes | #518 merged | |
| `claude/cleanup-1029-t3` | 2026-10-29 | yes | #520 merged | |
| `claude/loving-pascal-whopdf` | 2026-10-30 | yes | #538 merged, #514 merged, #512 merged, #511 merged, #510 merged, #508 merged, #506 merged, #499 merged, #493 merged, #469 merged, #467 merged, #466 merged, #465 merged, #433 merged, #428 merged, #427 merged, #425 merged, #422 merged, #414 merged, #412 merged, #160 closed (into main) | |
| `lakad-sakay/recording-rules` | 2026-10-30 | yes | #546 merged | |
| `lakad-sakay/recording-screen` | 2026-10-30 | yes | #548 merged | |
| `lakad-sakay/start-account` | 2026-10-30 | yes | #549 merged | |
| `onboarding/account-pages` | 2026-10-30 | yes | #543 merged | |
| `onboarding/forgot-password-steps` | 2026-10-30 | yes | #544 merged | |
| `onboarding/no-back-to-map` | 2026-10-30 | yes | #550 merged | |
| `onboarding/otp-phone-fields` | 2026-10-30 | yes | #540 merged | |
| `onboarding/permissions-settings-line` | 2026-10-30 | yes | #545 merged | |
| `onboarding/switch` | 2026-10-30 | yes | #539 merged | |
| `onboarding/track-routes-card` | 2026-10-30 | yes | #542 merged | |
| `onboarding/turnstile-bottom` | 2026-10-30 | yes | #552 merged | |
| `studio/editor-only-sign-in` | 2026-10-30 | yes | #551 merged | |
| `studio/lakad-sakay-parts` | 2026-10-30 | yes | #547 merged | |
| `account/delete` | 2026-10-31 | yes | #567 merged | |
| `account/fare` | 2026-10-31 | yes | #568 merged | |
| `account/stats` | 2026-10-31 | yes | #564 merged | |
| `apk/ride-recreation` | 2026-10-31 | yes | #587 merged | |
| `contribute/account-fare` | 2026-10-31 | yes | #584 merged | |
| `contribute/account-page` | 2026-10-31 | yes | #569 merged | |
| `contribute/delete-account` | 2026-10-31 | yes | #572 merged | |
| `contribute/error-boundary` | 2026-10-31 | yes | #566 merged | |
| `contribute/history-page` | 2026-10-31 | yes | #579 merged | |
| `contribute/lazy-save-screens` | 2026-10-31 | yes | #570 merged | |
| `contribute/logout-confirm` | 2026-10-31 | yes | #585 merged | |
| `contribute/map-data-source` | 2026-10-31 | yes | #560 merged | |
| `contribute/more-ride-kinds` | 2026-10-31 | yes | #573 merged | |
| `contribute/morph-check-buttons` | 2026-10-31 | yes | #598 merged | |
| `contribute/no-consent-screen` | 2026-10-31 | yes | #557 merged | |
| `contribute/no-download` | 2026-10-31 | yes | #588 merged | |
| `contribute/published-routes` | 2026-10-31 | yes | #586 merged | |
| `contribute/record-start` | 2026-10-31 | yes | #590 merged | |
| `contribute/recording-card` | 2026-10-31 | yes | #583 merged | |
| `contribute/save-recording-form` | 2026-10-31 | yes | #589 merged | |
| `contribute/start-morph` | 2026-10-31 | yes | #591 merged | |
| `contribute/stats-parse-optional` | 2026-10-31 | yes | #571 merged | |
| `contribute/tab-motion` | 2026-10-31 | yes | #582 merged | |
| `contribute/trail-pictures` | 2026-10-31 | yes | #574 merged | |
| `locator/eyes-follow-heading` | 2026-10-31 | yes | #580 merged | |
| `locator/wander-check-faces` | 2026-10-31 | yes | #592 merged | |
| `map/location-labels` | 2026-10-31 | yes | #559 merged | |
| `onboarding/code-auto-check` | 2026-10-31 | yes | #555 merged | |
| `onboarding/password-rule` | 2026-10-31 | yes | #554 merged | |
| `recording/flag-fold-tint` | 2026-10-31 | yes | #561 merged | |
| `recording/stop-sheet` | 2026-10-31 | yes | #563 merged | |
| `routes/trail-colours` | 2026-10-31 | yes | #575 merged | |
| `skills/tidy` | 2026-10-31 | yes | #578 merged | |
| `start/account-tab` | 2026-10-31 | yes | #558 merged | |
| `studio/each-ride` | 2026-10-31 | yes | #553 merged | |
| `studio/password-rule` | 2026-10-31 | yes | #556 merged | |
| `studio/signboard-card-empties` | 2026-10-31 | yes | #562 merged | |
| `studio/signboard-race` | 2026-10-31 | yes | #581 merged | |
| `studio/vehicle-labels` | 2026-10-31 | yes | #576 merged | |
| `supabase/ledger-account-migrations` | 2026-10-31 | yes | #577 merged | |
| `test/loop-hintuan-tap` | 2026-10-31 | yes | #565 merged | |
| `tidy/contribute-typed-rpcs` | 2026-10-31 | yes | #597 merged | |
| `tidy/contribute-unused-code` | 2026-10-31 | yes | #596 merged | |
| `tidy/records` | 2026-10-31 | yes | #595 merged | |
| `tidy/stale-todos` | 2026-10-31 | yes | #594 merged | |
| `tidy/unused-code` | 2026-10-31 | yes | #593 merged | |
| `ci/build-only-paths` | 2026-11-01 | yes | #600 merged | |
| `contribute/account-settings` | 2026-11-01 | yes | #613 merged | |
| `contribute/account-test-refresh-window` | 2026-11-01 | yes | #619 merged | |
| `contribute/delete-account-v2` | 2026-11-01 | yes | #614 merged | |
| `contribute/fast-tabs` | 2026-11-01 | yes | #608 merged | |
| `contribute/history-many` | 2026-11-01 | yes | #607 merged | |
| `contribute/locator-note-toast` | 2026-11-01 | yes | #626 merged | |
| `contribute/map-inert` | 2026-11-01 | yes | #606 merged | |
| `contribute/pill-tap` | 2026-11-01 | yes | #612 merged | |
| `contribute/recorder-lock-handover` | 2026-11-01 | yes | #616 merged | |
| `contribute/shared-retrying-import` | 2026-11-01 | yes | #627 merged | |
| `contribute/slowmo` | 2026-11-01 | yes | #599 merged | |
| `contribute/slowmo-units` | 2026-11-01 | yes | #610 merged | |
| `contribute/start-offline` | 2026-11-01 | yes | #605 merged | |
| `contribute/tab-speed` | 2026-11-01 | yes | #602 merged | |
| `contribute/tidy` | 2026-11-01 | yes | #620 merged | |
| `contribute/toast-wiring` | 2026-11-01 | yes | #623 merged | |
| `contribute/toolbar-48` | 2026-11-01 | yes | #615 merged | |
| `contribute/toolbar-slide` | 2026-11-01 | yes | #603 merged | |
| `contribute/toolbar-stays` | 2026-11-01 | yes | #604 merged | |
| `contribute/turnstile-check-wait` | 2026-11-01 | yes | #624 merged | |
| `contribute/tutorial` | 2026-11-01 | yes | #617 merged | |
| `contribute/unfinished-credits` | 2026-11-01 | yes | #609 merged | |
| `docs/toast-tailwind-source` | 2026-11-01 | yes | #622 merged | |
| `ds/toast` | 2026-11-01 | yes | #618 merged | |
| `ds/toast-hide` | 2026-11-01 | yes | #621 merged | |
| `feat/locator-note-toast` | 2026-11-01 | yes | #625 merged | |
| `map/public-credits` | 2026-11-01 | yes | #601 merged | |
| `supabase/delete-account-keep-uploads` | 2026-11-01 | yes | #611 merged | |
| `contribute/apk-css-sources` | 2026-11-02 | yes | #635 merged | |
| `contribute/data-attributes` | 2026-11-02 | yes | #651 merged | |
| `contribute/flag-toast` | 2026-11-02 | yes | #628 merged | |
| `contribute/idb-waits` | 2026-11-02 | yes | #640 merged | |
| `contribute/km-rounding` | 2026-11-02 | yes | #659 merged | |
| `contribute/lazy-packing` | 2026-11-02 | yes | #656 merged | |
| `contribute/motion-folder` | 2026-11-02 | yes | #647 merged | |
| `contribute/motion-module` | 2026-11-02 | yes | #645 merged | |
| `contribute/native-contract` | 2026-11-02 | yes | #660 merged | |
| `contribute/native-tidy` | 2026-11-02 | yes | #658 merged | |
| `contribute/notice-words` | 2026-11-02 | yes | #643 merged | |
| `contribute/notification-buttons` | 2026-11-02 | yes | #638 merged | |
| `contribute/page-split-1` | 2026-11-02 | yes | #653 merged | |
| `contribute/page-split-2` | 2026-11-02 | yes | #654 merged | |
| `contribute/page-split-3` | 2026-11-02 | yes | #655 merged | |
| `contribute/paused-frost` | 2026-11-02 | yes | #631 merged | |
| `contribute/radial-frost` | 2026-11-02 | yes | #641 merged | |
| `contribute/ride-notification` | 2026-11-02 | yes | #632 merged | |
| `contribute/route-recorded-toast` | 2026-11-02 | yes | #630 merged | |
| `contribute/rpc-callers` | 2026-11-02 | yes | #661 merged | |
| `contribute/screen-registry` | 2026-11-02 | yes | #650 merged | |
| `contribute/skeletons` | 2026-11-02 | yes | #646 merged | |
| `contribute/tidy-r1` | 2026-11-02 | yes | #642 merged | |
| `contribute/toolbar-folder` | 2026-11-02 | yes | #648 merged | |
| `contribute/trail-picture-bound` | 2026-11-02 | yes | #634 merged | |
| `contribute/upload-words` | 2026-11-02 | yes | #662 merged | |
| `docs/contributor-records-tidy` | 2026-11-02 | yes | #639 merged | |
| `docs/retire-old-site` | 2026-11-02 | yes | #636 merged | |
| `ds/toast-compact` | 2026-11-02 | yes | #629 merged | |
| `fix/loop-tip-denied` | 2026-11-02 | yes | #633 merged | |
| `perf/shared-room` | 2026-11-02 | yes | #649 merged | |
| `test/pwa-cache-poll` | 2026-11-02 | yes | #644 merged | |
| `fix/chooser-hit-lines` | 2026-11-03 | yes | #667 merged | |
| `fix/map-bounds-laguna` | 2026-11-03 | yes | #668 merged | |
| `fix/seed-draft-pick` | 2026-11-03 | yes | #669 merged | |
| `test/map-data-picks` | 2026-11-03 | yes | #666 merged | |
| `test/turnstile-host-check` | 2026-11-03 | yes | #665 merged | |
| `claude/close-by-first-point` | 2026-11-04 | yes | #712 merged | |
| `claude/delete-account-keeps-uploads` | 2026-11-04 | yes | #678 merged | |
| `claude/draw-arrows` | 2026-11-04 | yes | #707 merged | |
| `claude/draw-brand-colour` | 2026-11-04 | yes | #698 merged | |
| `claude/draw-curve-bend` | 2026-11-04 | yes | #720 merged | |
| `claude/draw-curve-handles` | 2026-11-04 | yes | #719 merged | |
| `claude/draw-curves` | 2026-11-04 | yes | #717 merged | |
| `claude/gate-test-discard-name` | 2026-11-04 | yes | #715 merged | |
| `claude/map-pins` | 2026-11-04 | yes | #684 merged | |
| `claude/quirky-rubin-f3y71l` | 2026-11-04 | yes | #685 merged, #683 merged, #681 merged, #680 merged, #679 merged, #677 merged | |
| `claude/refuse-delete-uploads` | 2026-11-04 | yes | #692 merged | |
| `claude/route-line-brand` | 2026-11-04 | yes | #700 merged | |
| `claude/smaller-hotspot-dots` | 2026-11-04 | yes | #697 merged | |
| `claude/snap-preview` | 2026-11-04 | yes | #709 merged | |
| `claude/studio-auth-dialogs` | 2026-11-04 | yes | #716 merged | |
| `claude/studio-auth-messages` | 2026-11-04 | yes | #714 merged | |
| `claude/studio-contribution-keys` | 2026-11-04 | yes | #705 merged | |
| `claude/studio-delete-joins-draft` | 2026-11-04 | yes | #695 merged | |
| `claude/studio-discard-own-only` | 2026-11-04 | yes | #696 merged | |
| `claude/studio-edit-opens-own-draft` | 2026-11-04 | yes | #699 merged | |
| `claude/studio-hotspot-edit-from-draft` | 2026-11-04 | yes | #710 merged | |
| `claude/studio-review-messages` | 2026-11-04 | yes | #711 merged | |
| `claude/studio-route-panel-beside-map` | 2026-11-04 | yes | #708 merged | |
| `claude/studio-save-ends-follow-line` | 2026-11-04 | yes | #704 merged | |
| `claude/studio-save-facts-from-draft` | 2026-11-04 | yes | #718 merged | |
| `claude/studio-signboards-from-draft` | 2026-11-04 | yes | #703 merged | |
| `claude/studio-snap-draw-toolbar` | 2026-11-04 | yes | #701 merged | |
| `claude/studio-supabase-env-zod` | 2026-11-04 | yes | #706 merged | |
| `claude/studio-ux-drawing-plan` | 2026-11-04 | yes | #694 merged | |
| `claude/studio-ux-plan` | 2026-11-04 | yes | #691 merged | |
| `claude/studio-ux-plan-status` | 2026-11-04 | yes | #713 merged | |
| `claude/track-routes-card` | 2026-11-04 | yes | #682 merged | |
| `deps/minor-and-patch-without-maplibre` | 2026-11-04 | yes | #687 merged | |
| `docs/public-page-data-exception` | 2026-11-04 | no | #690 merged | |
| `fix/page-error-boundaries` | 2026-11-04 | no | #693 merged | |
| `lint/core-purity` | 2026-11-04 | no | #689 merged | |
| `tidy/code-leftovers` | 2026-11-04 | yes | #686 merged | |
| `tidy/doc-leftovers` | 2026-11-04 | yes | #688 merged | |
| `basemap-violet-1` | 2026-11-05 | yes | #764 closed | |
| `basemap-violet-2` | 2026-11-05 | yes | #765 merged | |
| `basemap-violet-3` | 2026-11-05 | no | #766 closed | |
| `claude/card-red-surface-light-400` | 2026-11-05 | yes | #722 merged | |
| `claude/database-review-nov5` | 2026-11-05 | yes | #740 merged | |
| `claude/draft-published-migration` | 2026-11-05 | yes | #745 merged | |
| `claude/draft-update-makerless` | 2026-11-05 | yes | #732 merged | |
| `claude/draw-chevrons-freehand` | 2026-11-05 | yes | #736 merged | |
| `claude/draw-cursor-line` | 2026-11-05 | yes | #727 merged | |
| `claude/draw-handle-colours` | 2026-11-05 | yes | #734 merged | |
| `claude/draw-handle-diamond` | 2026-11-05 | yes | #743 merged | |
| `claude/draw-handles-selected` | 2026-11-05 | yes | #729 merged | |
| `claude/draw-keys` | 2026-11-05 | yes | #735 merged | |
| `claude/draw-line-solid` | 2026-11-05 | yes | #724 merged | |
| `claude/draw-move-tool` | 2026-11-05 | yes | #744 merged | |
| `claude/draw-pen-live-curve` | 2026-11-05 | yes | #725 merged | |
| `claude/draw-toolbar-beside-sidebar` | 2026-11-05 | yes | #749 merged | |
| `claude/draw-toolbar-cleanup` | 2026-11-05 | yes | #767 merged | |
| `claude/draw-toolbar-figma-icons` | 2026-11-05 | yes | #759 merged | |
| `claude/draw-toolbar-no-close-loop` | 2026-11-05 | yes | #763 merged | |
| `claude/draw-toolbar-no-info` | 2026-11-05 | yes | #762 merged | |
| `claude/drop-as-never` | 2026-11-05 | yes | #769 merged | |
| `claude/fix-handle-held-check` | 2026-11-05 | yes | #752 merged | |
| `claude/keep-uploads-on-user-delete` | 2026-11-05 | yes | #747 merged | |
| `claude/retire-studio-drafts-flag` | 2026-11-05 | yes | #748 merged | |
| `claude/review-rules` | 2026-11-05 | yes | #728 merged | |
| `claude/review-test-beside-sidebar` | 2026-11-05 | yes | #761 merged | |
| `claude/rules-draft-published` | 2026-11-05 | yes | #742 merged | |
| `claude/schema-snapshot` | 2026-11-05 | yes | #773 merged | |
| `claude/snap-preview-faster` | 2026-11-05 | yes | #730 merged | |
| `claude/studio-draft-tap-edits` | 2026-11-05 | yes | #768 merged | |
| `claude/studio-drafts-in-top-bar` | 2026-11-05 | yes | #757 merged | |
| `claude/studio-map-controls` | 2026-11-05 | yes | #731 merged | |
| `claude/studio-panel-left` | 2026-11-05 | yes | #726 merged | |
| `claude/studio-publish-data` | 2026-11-05 | yes | #750 merged | |
| `claude/studio-route-sidebar` | 2026-11-05 | yes | #751 merged | |
| `claude/studio-sidebar-drop-boxes` | 2026-11-05 | yes | none | |
| `claude/studio-sidebar-hotspots` | 2026-11-05 | yes | #756 merged | |
| `claude/studio-sidebar-line-detail` | 2026-11-05 | yes | #754 merged | |
| `claude/studio-sidebar-publish-data` | 2026-11-05 | yes | #774 merged | |
| `claude/studio-sidebar-published` | 2026-11-05 | yes | #755 merged | |
| `claude/studio-sidebar-route-line` | 2026-11-05 | yes | #753 merged | |
| `claude/studio-sidebar-toolbar-extras` | 2026-11-05 | yes | #758 merged | |
| `claude/studio-sign-in-figma` | 2026-11-05 | yes | #760 merged | |
| `claude/studio-ux-plan-keys` | 2026-11-05 | yes | #733 merged | |
| `claude/studio-ux-plan-nov5` | 2026-11-05 | yes | #723 merged | |
| `claude/studio-wheel` | 2026-11-05 | yes | #737 merged | |
| `claude/studio-wheel-smooth` | 2026-11-05 | yes | #741 merged | |
| `claude/test-drafts-wait-drawing-ends` | 2026-11-05 | yes | #738 merged | |
| `claude/tests-prove-claims` | 2026-11-05 | yes | #775 merged | |
| `docs/attach-spec` | 2026-11-05 | no | #771 merged | |
| `docs/record-delete-account-migrations` | 2026-11-05 | no | #721 merged | |
| `test/profile-skeleton-flake` | 2026-11-05 | yes | #739 merged | |
| `ci/publish-to-staging` | 2026-11-06 | yes | #820 merged | |
| `claude/apk-autostart-guide` | 2026-11-06 | yes | #807 merged | |
| `claude/apk-last-known-location` | 2026-11-06 | yes | #804 merged | |
| `claude/apk-load-timeout` | 2026-11-06 | yes | #806 merged | |
| `claude/apk-locate-off-ready` | 2026-11-06 | yes | #800 merged | |
| `claude/apk-location-off` | 2026-11-06 | yes | #787 merged | |
| `claude/apk-map-cache` | 2026-11-06 | yes | #790 merged | |
| `claude/apk-map-online` | 2026-11-06 | yes | #784 merged | |
| `claude/apk-offline-style` | 2026-11-06 | yes | #789 merged | |
| `claude/apk-offline-style-switch` | 2026-11-06 | yes | #805 merged | |
| `claude/apk-reopen-fixes` | 2026-11-06 | yes | #809 merged | |
| `claude/apk-reopen-recording` | 2026-11-06 | yes | #825 merged | |
| `claude/apk-ride-service` | 2026-11-06 | yes | #793 merged | |
| `claude/apk-ride-switch` | 2026-11-06 | yes | #785 merged | |
| `claude/apk-ride-taps` | 2026-11-06 | yes | #799 merged | |
| `claude/apk-start-location-off` | 2026-11-06 | yes | #803 merged | |
| `claude/apk-swipe-away` | 2026-11-06 | yes | #798 merged | |
| `claude/apk-tile-cache` | 2026-11-06 | yes | #801 merged | |
| `claude/commuter-hotspot-dots` | 2026-11-06 | yes | #827 merged | |
| `claude/commuter-pins-off` | 2026-11-06 | yes | #813 merged | |
| `claude/contributor-checks-after-793` | 2026-11-06 | yes | #796 merged | |
| `claude/contributor-route-colours` | 2026-11-06 | no | #824 closed | |
| `claude/counters-count-cards` | 2026-11-06 | yes | #821 merged | |
| `claude/drop-dead-weight` | 2026-11-06 | yes | #772 merged | |
| `claude/drop-hint-check` | 2026-11-06 | yes | #776 merged | |
| `claude/history-used-on-map` | 2026-11-06 | yes | #810 merged | |
| `claude/keep-recording-flake` | 2026-11-06 | yes | #814 merged | |
| `claude/lock-map-tables` | 2026-11-06 | yes | #770 merged | |
| `claude/phone-test-install-deps-cache` | 2026-11-06 | yes | #802 merged | |
| `claude/place-search-landmark-refresh` | 2026-11-06 | yes | #826 merged | |
| `claude/place-search-landmarks` | 2026-11-06 | yes | #811 merged | |
| `claude/place-search-landmarks-v2` | 2026-11-06 | yes | #823 merged | |
| `claude/place-search-own-places` | 2026-11-06 | yes | #817 merged | |
| `claude/profile-claim-race` | 2026-11-06 | yes | #792 merged | |
| `claude/route-card-commuter-wiring` | 2026-11-06 | yes | #812 merged | |
| `claude/route-card-controller` | 2026-11-06 | yes | #788 merged | |
| `claude/route-card-handover` | 2026-11-06 | yes | #782 merged | |
| `claude/route-card-list` | 2026-11-06 | yes | #786 merged | |
| `claude/route-card-modes` | 2026-11-06 | yes | #780 merged, #306 merged (into main) | |
| `claude/route-card-shadows` | 2026-11-06 | yes | #822 merged | |
| `claude/route-card-sheet` | 2026-11-06 | yes | #794 merged | |
| `claude/route-card-studio-wiring` | 2026-11-06 | yes | #815 merged | |
| `claude/route-card-tokens` | 2026-11-06 | yes | #779 merged | |
| `claude/route-icons-sprite` | 2026-11-06 | yes | #791 merged | |
| `claude/route-lines-mode-colours` | 2026-11-06 | yes | #818 merged | |
| `claude/save-stand-in-tables` | 2026-11-06 | yes | #816 merged | |
| `claude/sheet-scroll-lag` | 2026-11-06 | yes | #797 merged | |
| `claude/start-morph-waits-for-card` | 2026-11-06 | yes | #783 merged | |
| `claude/studio-sidebar-tapped-hotspot` | 2026-11-06 | yes | #777 merged | |
| `claude/trip-card-plays` | 2026-11-06 | yes | #808 merged | |
| `release/ride-detail` | 2026-11-06 | yes | #778 merged (into main) | |
| `sync/map-data-into-staging` | 2026-11-06 | yes | #819 merged | |
| `claude/border-tertiary` | 2026-11-07 | yes | #833 merged | |
| `claude/free-drag-sheets` | 2026-11-07 | yes | #832 merged | |
| `claude/place-search-07-answers` | 2026-11-07 | yes | #837 merged | |
| `claude/place-search-done` | 2026-11-07 | yes | #831 merged | |
| `claude/place-search-landmarks-model` | 2026-11-07 | yes | #829 merged | |
| `claude/place-search-pin-tickets` | 2026-11-07 | yes | #836 merged | |
| `claude/place-search-studio` | 2026-11-07 | yes | #830 merged | |
| `claude/route-card-readme-close` | 2026-11-07 | yes | #834 merged | |
| `claude/route-lines-rest-active` | 2026-11-07 | yes | #828 merged | |
| `claude/toast-below-close` | 2026-11-07 | yes | #835 merged | |
| `claude/apk-battery-unrestricted` | 2026-11-08 | no | #844 merged | |
| `claude/apk-published-from-site` | 2026-11-08 | yes | #842 merged | |
| `claude/apk-stale-notice` | 2026-11-08 | yes | #845 merged | |
| `claude/apk-stop-icon` | 2026-11-08 | yes | #843 merged | |
| `claude/apk-task-removed` | 2026-11-08 | yes | #841 merged | |
| `claude/fix-drawing-suites-search-bar` | 2026-11-08 | yes | #839 merged | |
| `claude/low-tap-race` | 2026-11-08 | yes | #838 merged | |
| `claude/place-search-06-pin` | 2026-11-08 | yes | #840 merged | |
| `claude/recorder-lifecycle-brief` | 2026-11-08 | yes | #846 merged | |
| `claude/apk-drop-geolocation-plugin` | 2026-11-10 | no | #795 merged | |
| `claude/ci-cache-downloads` | 2026-11-10 | yes | #879 merged | |
| `claude/drawing-on-studio-prs` | 2026-11-10 | yes | #882 merged | |
| `claude/emulator-sakay-tap` | 2026-11-10 | yes | #872 merged | |
| `claude/fix-clock` | 2026-11-10 | yes | #870 merged | |
| `claude/fix-log-failures` | 2026-11-10 | yes | #871 merged | |
| `claude/flake-two-editors` | 2026-11-10 | yes | #880 merged | |
| `claude/footbridges-01-file` | 2026-11-10 | yes | #891 merged | |
| `claude/footbridges-02-layer` | 2026-11-10 | yes | #894 merged | |
| `claude/footbridges-plan` | 2026-11-10 | yes | #861 merged | |
| `claude/glossary-check` | 2026-11-10 | yes | #886 merged | |
| `claude/go-here-plan` | 2026-11-10 | yes | #896 merged | |
| `claude/keep-recording-brands` | 2026-11-10 | yes | #864 merged | |
| `claude/long-files-check` | 2026-11-10 | yes | #885 merged | |
| `claude/place-search-07-go-here` | 2026-11-10 | yes | #855 merged | |
| `claude/pr-areas` | 2026-11-10 | yes | #884 merged | |
| `claude/recorder-lifecycle-audit` | 2026-11-10 | yes | #854 merged | |
| `claude/release-0.4.0-doc` | 2026-11-10 | yes | #848 merged | |
| `claude/ride-machine` | 2026-11-10 | yes | #856 merged | |
| `claude/ride-native` | 2026-11-10 | yes | #857 merged | |
| `claude/ride-page-reads` | 2026-11-10 | yes | #859 merged | |
| `claude/ride-restart-location` | 2026-11-10 | yes | #858 merged | |
| `claude/route-card-cleanup` | 2026-11-10 | yes | #892 merged | |
| `claude/route-card-component` | 2026-11-10 | yes | #867 merged | |
| `claude/search-results-clip` | 2026-11-10 | yes | #853 merged | |
| `claude/share-ride-diagnostics` | 2026-11-10 | yes | #860 merged | |
| `claude/sidebar-approve` | 2026-11-10 | yes | #865 merged | |
| `claude/sidebar-draft-only` | 2026-11-10 | yes | #866 merged | |
| `claude/sidebar-lock-approve` | 2026-11-10 | yes | #869 merged | |
| `claude/staging-red-alert` | 2026-11-10 | yes | #881 merged | |
| `claude/start-location-dialog` | 2026-11-10 | yes | #863 merged | |
| `claude/state-machines-status` | 2026-11-10 | yes | #868 merged | |
| `claude/studio-search-dot-stays` | 2026-11-10 | yes | #852 merged | |
| `claude/test-latest-release` | 2026-11-10 | yes | #862 merged | |
| `claude/ticket-native-failed-writes` | 2026-11-10 | yes | #883 merged | |
| `release/app-v0.4.0` | 2026-11-10 | yes | #849 merged (into main) | |
| `claude/contribute-headroom` | 2026-11-11 | yes | #913 merged | |
| `claude/db-wait-ready` | 2026-11-11 | yes | #910 merged | |
| `claude/footbridge-story-worker` | 2026-11-11 | yes | #897 merged | |
| `claude/footbridges-03-studio` | 2026-11-11 | yes | #895 merged | |
| `claude/live-data-preview-rule` | 2026-11-11 | yes | #919 merged | |
| `claude/map-failure-move` | 2026-11-11 | yes | #924 merged | |
| `claude/phone-block-fix` | 2026-11-11 | yes | #907 merged | |
| `claude/phone-block-trying` | 2026-11-11 | yes | #911 merged | |
| `claude/release-rhythm-draft` | 2026-11-11 | yes | #887 merged | |
| `claude/remove-review-workspace` | 2026-11-11 | yes | #878 merged | |
| `claude/retire-review-steps` | 2026-11-11 | yes | #746 merged | |
| `claude/review-deb-cache` | 2026-11-11 | yes | #915 merged | |
| `claude/route-reports-worker` | 2026-11-11 | yes | #912 merged | |
| `claude/route-stops-card` | 2026-11-11 | yes | #899 merged | |
| `claude/routes-story-plays` | 2026-11-11 | yes | #889 merged | |
| `claude/sec-01-environments` | 2026-11-11 | yes | #902 merged | |
| `claude/shell-open-on-routes` | 2026-11-11 | yes | #923 merged | |
| `claude/staging-protection-doc` | 2026-11-11 | yes | #918 merged | |
| `claude/story-demo-password` | 2026-11-11 | yes | #900 merged | |
| `claude/storybook-play` | 2026-11-11 | yes | #888 merged | |
| `claude/studio-no-p2p` | 2026-11-11 | yes | #904 merged | |
| `claude/studio-story-plays` | 2026-11-11 | yes | #890 merged | |
| `claude/studio-terminal-pre-tick` | 2026-11-11 | yes | #917 merged | |
| `claude/ticket-studio-toast` | 2026-11-11 | yes | #893 merged | |
| `claude/tickets-ux04-ux07` | 2026-11-11 | yes | #901 merged | |
| `claude/trip-controller` | 2026-11-11 | yes | #906 merged | |
| `claude/trip-controller-cleanup` | 2026-11-11 | yes | #908 merged | |
| `claude/trip-ends-and-stops` | 2026-11-11 | yes | #905 merged | |
| `release/app-v0.4.0-b` | 2026-11-11 | yes | #920 merged (into main) | |
| `claude/adr-0009-join-point` | 2026-11-12 | yes | #942 merged | |
| `claude/app-page-screens` | 2026-11-12 | yes | #969 merged (into main) | |
| `claude/app-page-waitlist` | 2026-11-12 | yes | #982 merged (into main) | |
| `claude/app-release-guard` | 2026-11-12 | yes | #945 merged | |
| `claude/app-separate-signing` | 2026-11-12 | yes | #949 merged | |
| `claude/app-sign-dry-run` | 2026-11-12 | yes | #974 merged | |
| `claude/app-sign-dry-run-ticket` | 2026-11-12 | yes | #972 merged | |
| `claude/back-closes-card` | 2026-11-12 | yes | #937 merged | |
| `claude/back-merge-main-969` | 2026-11-12 | yes | #973 merged | |
| `claude/basemap-fallback` | 2026-11-12 | yes | #962 merged | |
| `claude/basemap-fallback-suite-ticket` | 2026-11-12 | yes | #963 merged | |
| `claude/card-headings` | 2026-11-12 | yes | #946 merged | |
| `claude/change-password-story-focus` | 2026-11-12 | yes | #956 merged | |
| `claude/ci-browser-suite-action` | 2026-11-12 | yes | #965 merged | |
| `claude/ci-keep-staging-runs` | 2026-11-12 | yes | #929 merged | |
| `claude/ci-summary-known-results` | 2026-11-12 | yes | #980 merged | |
| `claude/contribute-page-split-plan` | 2026-11-12 | yes | #981 merged | |
| `claude/contribute-stories-heading-focus` | 2026-11-12 | yes | #957 merged | |
| `claude/contributions-preview-ticket` | 2026-11-12 | yes | #943 merged | |
| `claude/deferred-search` | 2026-11-12 | yes | #955 merged | |
| `claude/dependabot-composite-actions` | 2026-11-12 | yes | #938 merged | |
| `claude/dev-dependency-audit` | 2026-11-12 | yes | #930 merged | |
| `claude/env-modules-only` | 2026-11-12 | yes | #966 merged | |
| `claude/escape-innermost` | 2026-11-12 | yes | #959 merged | |
| `claude/first-visit-tiles-kept` | 2026-11-12 | yes | #976 merged | |
| `claude/flake-upload-history` | 2026-11-12 | yes | #916 merged | |
| `claude/flake-upload-status-wait` | 2026-11-12 | yes | #933 merged | |
| `claude/group-suite-fixture` | 2026-11-12 | yes | #926 merged | |
| `claude/index-weight` | 2026-11-12 | yes | #953 merged | |
| `claude/lazy-chunks-retry` | 2026-11-12 | yes | #932 merged | |
| `claude/lint-no-enum` | 2026-11-12 | yes | #931 merged | |
| `claude/lint-no-plain-lazy` | 2026-11-12 | yes | #975 merged | |
| `claude/lint-warn-as` | 2026-11-12 | yes | #970 merged | |
| `claude/map-diagnostics-studio-only` | 2026-11-12 | yes | #967 merged | |
| `claude/map-expose-move` | 2026-11-12 | yes | #927 merged | |
| `claude/maplibre-upgrade-ticket` | 2026-11-12 | yes | #941 merged | |
| `claude/nightly-failure-alerts` | 2026-11-12 | yes | #971 merged | |
| `claude/pensive-newton-k9ui4g` | 2026-11-12 | yes | #968 merged | |
| `claude/phone-speed-3g` | 2026-11-12 | yes | #978 merged | |
| `claude/preview-sign-in-rule` | 2026-11-12 | yes | #921 merged | |
| `claude/privacy-brief-matches-delete` | 2026-11-12 | yes | #979 merged | |
| `claude/pwa-test-tile-detail` | 2026-11-12 | yes | #950 merged | |
| `claude/route-list-rows-move` | 2026-11-12 | yes | #948 merged | |
| `claude/sheet-headings` | 2026-11-12 | yes | #951 merged | |
| `claude/staging-runs-finish` | 2026-11-12 | yes | #961 merged | |
| `claude/stale-line-race` | 2026-11-12 | yes | #958 merged | |
| `claude/ticket-rerequest-location` | 2026-11-12 | yes | #925 merged | |
| `claude/tolerant-index-reader` | 2026-11-12 | yes | #939 merged | |
| `claude/trip-notes-move` | 2026-11-12 | yes | #947 merged | |
| `claude/watch-deploy-check` | 2026-11-12 | yes | #964 merged | |
| `claude/watch-reports-its-gaps` | 2026-11-12 | yes | #928 merged | |
| `claude/website-app-page` | 2026-11-12 | yes | #940 merged (into main) | |
| `claude/back-merge-main-982` | 2026-11-13 | yes | #986 merged | |
| `claude/back-merge-main-995` | 2026-11-13 | yes | #996 merged | |
| `claude/flag-stop-notes` | 2026-11-13 | yes | #984 merged | local copy |
| `claude/stop-notes-regression-checks` | 2026-11-13 | yes | #994 merged | |
| `claude/theme-brand-purple` | 2026-11-13 | yes | #985 merged | |
| `claude/deps-tooling-vite-824` | 2026-11-14 | yes | none | |
| `claude/probe-sheet-drag` | 2026-11-16 | no | #1012 closed | |

### 2. Close PR first

| PR | Branch | Reason |
| --- | --- | --- |
| #977 | `claude/commuter-parts-balance` | Overtaken: it rebalanced the commuter suite's three parts, and since #1014 the suite runs in six parts sized by measured time. It now conflicts with staging |
| #993 | `claude/handoff-review-fixes` | A handoff note from the night of 2026-11-12, opened "not for merging". Its session ended that day; its CI is cancelled and red |
| #462 | `claude/studio-keep-draft-revision` | Stale draft, last touched 2026-10-28. It fixes `studio/review/review-conflict.tsx`, and the review step was retired on 2026-11-05: the folder no longer exists on staging |
| #364 | `claude/codebase-check-2026-10-23` | A report-only PR from 2026-10-23, 2,451 commits behind staging. It adds one file under `.scratch/audit/`. **Read before closing:** its findings (1 critical, 5 high) are in that file and nowhere on staging. Close it only if they were dealt with, or merge the one file first |
| #133 | `claude/ios-install-offer` | Stale draft from 2026-10-13, 3,403 commits behind staging, stacked on a branch that is gone. Its card "waits on its frame" (a design). The iPhone detection in it is not on staging: closing it parks that work on the branch, so the branch would move to "Ask me" rather than be deleted |

Open and not stale, kept: #637 (HOLD on purpose until the old site redirects), #903 (Go here ticket 01), #909 and #914 (route reports, drafts waiting on the owner), #922 (tiles, draft waiting on the owner), #672 and #992 (Dependabot).

After #977 and #993 close, their branches join "Safe to delete". The other three only if the owner says so.

### 3. Ask me (32)

| Branch | Last commit | PR | Why it is here |
| --- | --- | --- | --- |
| `feature/trip-gap` | 2026-09-30 | none | 1 commit, 2 files (+6 −2): the trip card's gap under the header. Never opened as a PR |
| `studio-plan` | 2026-10-04 | none | 1 commit, 1 file: the studio-for-a-team plan. You said to keep it for the future. **Keep** |
| `claude/refactor-issues` | 2026-10-13 | none | 1 commit, 5 scratch notes (+227): four refactors planned on 2026-10-13 |
| `claude/peaceful-lovelace-5jyykk` | 2026-10-14 | none | 1 commit, 1 scratch note (+92): an outdated-code audit of 2026-10-14 |
| `claude/preview-colour-and-map-style` | 2026-10-16 | none | A preview merge of #179 and #180. Every change in it is already on staging. Looks safe |
| `claude/preview-everything` | 2026-10-16 | none | A preview merge from 2026-10-16, 33 commits ahead; 5 of them are not on staging as they stand |
| `claude/release-base` | 2026-10-16 | none | A release rehearsal from 2026-10-16 with a revert of #199 in it; 2 commits not on staging |
| `dryrun/release-final` | 2026-10-16 | none | A release rehearsal from 2026-10-16; 1 commit not on staging (a repeat merge) |
| `claude/kind-cannon-sqd1ov` | 2026-10-21 | none | 1 commit, 3 files (+107 −3): the ferry colour and line ramps synced from Figma. Not on staging |
| `claude/exciting-volta-oaumqy` | 2026-10-22 | none | 5 commits of scratch notes for the studio-maps wave; 4 not on staging |
| `claude/lane-d-screenshots` | 2026-10-22 | none | Holds only screenshots for a PR, no shared history with staging. Deleting it breaks those pictures in the PR |
| `claude/trail-route-style-shots` | 2026-10-24 | none | Same: only screenshots for the trail route-style PR |
| `claude/fix-review-test` | 2026-10-27 | none | 1 commit, 2 files (+14): a fix to the review step, which was retired on 2026-11-05. Looks obsolete |
| `claude/cleanup-platform-14-upload` | 2026-10-28 | none | 1 commit, 3 files (+204 −17): what the tiles upload chooses to delete. Not on staging |
| `onboarding/permissions-screen` | 2026-10-30 | #541 merged | PR #541 merged; the tip is a later merge of staging into it and adds nothing of its own. Looks safe |
| `contribute/track-routes-card` | 2026-11-01 | none | 1 commit (+80): "Track your routes: the once-per-phone rule (parked)" |
| `contribute/screen-routes` | 2026-11-02 | none | 1 commit, 31 files (+252 −134): one screen registry for contribute. Not on staging as it stands |
| `claude/studio-sidebar` | 2026-11-05 | none | 2 commits, 31 files (+750 −413): "Studio sidebar: the review's fixes". Not on staging |
| `claude/go-here-06-countdown` | 2026-11-10 | none | Go here ticket 06, logic only: 3 commits not on staging. Unopened work. **Keep** |
| `claude/phone-block-keeps-data` | 2026-11-10 | none | 1 commit: a ticket file (+28). Not on staging |
| `claude/shots-contributor-flow` | 2026-11-10 | none | Holds only screenshots (the contributor recording flow), no shared history with staging |
| `claude/flake-upload-investigate` | 2026-11-11 | none | 1 commit; the same change is already on staging. Looks safe |
| `claude/flake-upload-loop` | 2026-11-11 | none | Its own message: "Throwaway: loop upload-test 12 times on a CI runner (never merged)". Looks safe |
| `claude/go-here-03-other-routes` | 2026-11-11 | none | Go here ticket 03, logic: 9 commits, 26 files (+1838). Unopened work. **Keep** |
| `claude/go-here-05-walking` | 2026-11-11 | none | Go here ticket 05: 5 commits, 12 files. Unopened work. **Keep** |
| `claude/go-here-05b-major-roads` | 2026-11-11 | none | Go here ticket 05b: 7 commits, 21 files. Unopened work. **Keep** |
| `claude/go-here-05c-hint` | 2026-11-11 | none | Go here ticket 05c: 8 commits, 23 files. Unopened work. **Keep** |
| `claude/route-end-indexes` | 2026-11-11 | none | 2 commits, 9 files (+267): a database change with its paste file. Not on staging and not applied, as far as the branch shows |
| `claude/shots-route-stops-card` | 2026-11-11 | none | 4 commits, 47 screenshot files for the route-stops card PR |
| `claude/spike-build-per-page` | 2026-11-11 | none | Its own message: "Spike, not to merge". 1 file (+29) |
| `claude/ticket-ledger-my-uses` | 2026-11-11 | none | 2 commits: a ticket file (+62). Not on staging |
| `claude/phone-taps-in-view` | 2026-11-16 | none | Last commit 2026-11-16; the same change is already on staging. Looks safe once a week old |

### Always kept (17)

| Branch | Last commit | Merged into staging | PR | |
| --- | --- | --- | --- | --- |
| `dependabot/npm_and_yarn/staging/postgres-4.1.0` | 2026-11-14 | no | #992 open | dependabot |
| `dependabot/npm_and_yarn/staging/tooling-0549be27d2` | 2026-11-14 | yes | #991 closed | dependabot |
| `dependabot/npm_and_yarn/staging/vite-plugin-pwa-2.0.0` | 2026-11-14 | no | #672 open | dependabot |
| `main` | 2026-11-14 | yes | #851 merged, #313 merged, #308 merged | protected name |
| `dependabot/github_actions/dot-github/actions/prepare-app-build/staging/actions-73651558a9` | 2026-11-15 | no | #989 closed | dependabot |
| `dependabot/npm_and_yarn/staging/runtime-54c26d8e69` | 2026-11-15 | no | #1003 closed | dependabot |
| `staging` | 2026-11-21 | yes | 39 release PRs into main | protected name |
| `claude/ios-install-offer` | 2026-10-13 | no | #133 open | open PR |
| `claude/codebase-check-2026-10-23` | 2026-10-23 | no | #364 open | open PR |
| `claude/studio-keep-draft-revision` | 2026-10-28 | no | #462 open | open PR |
| `chore/drop-old-origins` | 2026-11-02 | no | #637 open | open PR |
| `claude/go-here-01-options` | 2026-11-11 | no | #903 open | open PR |
| `claude/route-reports-adr` | 2026-11-11 | no | #909 open | open PR |
| `claude/route-reports-studio` | 2026-11-11 | no | #914 open | open PR |
| `claude/tiles-custom-domain-only` | 2026-11-11 | no | #922 open | open PR |
| `claude/commuter-parts-balance` | 2026-11-12 | no | #977 open | open PR |
| `claude/handoff-review-fixes` | 2026-11-13 | no | #993 open | open PR |

### Kept for now: merged, but touched in the last 7 days (102)

All are safe by the same rule once a week has passed. Nothing to decide today.

| Branch | Last commit | Merged into staging | PR | |
| --- | --- | --- | --- | --- |
| `claude/deps-tooling` | 2026-11-14 | yes | #999 merged | |
| `claude/fast-uri-advisory` | 2026-11-14 | yes | #1000 merged | |
| `claude/offline-suite-sw-timeout` | 2026-11-14 | yes | #1005 merged | |
| `claude/precache-placeholder-guard` | 2026-11-14 | yes | #1004 merged | |
| `claude/react-query-5107` | 2026-11-14 | yes | #1001 merged | |
| `claude/waitlist-secret-key` | 2026-11-14 | yes | #1006 merged | |
| `claude/ci-e2e-shared-scope` | 2026-11-16 | yes | #1040 merged | |
| `claude/ci-flakes-live-basemap` | 2026-11-16 | yes | #1027 merged | |
| `claude/ci-live-services-switch` | 2026-11-16 | yes | #1038 merged | |
| `claude/ci-path-selection-gaps` | 2026-11-16 | yes | #1016 merged | |
| `claude/ci-shards-and-merges` | 2026-11-16 | yes | #1014 merged | |
| `claude/ci-speed-phase-1-summary` | 2026-11-16 | yes | #1017 merged | |
| `claude/docs-github-guard-and-sheet-snap` | 2026-11-16 | yes | #1013 merged | |
| `claude/drop-unused-link-row` | 2026-11-16 | yes | #1019 merged | |
| `claude/e2e-evaluate-no-map-return` | 2026-11-16 | yes | #1011 merged | |
| `claude/e2e-name-failed-loads` | 2026-11-16 | yes | #1032 merged | |
| `claude/e2e-osrm-stand-in` | 2026-11-16 | yes | #1039 merged | |
| `claude/e2e-outside-requests-audit` | 2026-11-16 | yes | #1037 merged | |
| `claude/no-as-contribute-map` | 2026-11-16 | yes | #1024 merged | |
| `claude/no-as-contribute-native` | 2026-11-16 | yes | #1021 merged | |
| `claude/no-as-locator` | 2026-11-16 | yes | #1028 merged | |
| `claude/no-as-routes-map-a` | 2026-11-16 | yes | #1029 merged | |
| `claude/no-as-routes-map-b` | 2026-11-16 | yes | #1033 merged | |
| `claude/no-as-routes-model` | 2026-11-16 | yes | #1025 merged | |
| `claude/no-as-routes-published` | 2026-11-16 | yes | #1022 merged | |
| `claude/no-as-scripts-node` | 2026-11-16 | yes | #1023 merged | |
| `claude/no-as-shared-ui` | 2026-11-16 | yes | #1026 merged | |
| `claude/no-as-studio-panels` | 2026-11-16 | yes | #1034 merged | |
| `claude/phone-test-parts` | 2026-11-16 | yes | #1015 merged | |
| `claude/save-drafts-fallback-scoped` | 2026-11-16 | yes | #1020 merged | |
| `claude/stop-notes-max-shown` | 2026-11-16 | yes | #1018 merged | |
| `claude/studio-data-kept-assertions` | 2026-11-16 | yes | #1035 merged | |
| `claude/type-assertion-tickets` | 2026-11-16 | yes | #1030 merged | |
| `claude/type-assertions-rule-error` | 2026-11-16 | yes | #1036 merged | |
| `claude/android-back-closes-top-layer` | 2026-11-17 | yes | #1052 merged | |
| `claude/app-page-content-policy` | 2026-11-17 | yes | #1058 merged | |
| `claude/app-visit-test-key` | 2026-11-17 | yes | #1061 merged | |
| `claude/ci-flakes-05-notes` | 2026-11-17 | yes | #1064 merged | |
| `claude/content-policy-report-only` | 2026-11-17 | yes | #1056 merged | |
| `claude/dependabot-hold-majors` | 2026-11-17 | yes | #1050 merged | |
| `claude/deps-picomatch-ticket` | 2026-11-17 | yes | #1062 merged | |
| `claude/e2e-basemap-stand-in` | 2026-11-17 | yes | #1041 merged | |
| `claude/e2e-outside-tripwire` | 2026-11-17 | yes | #1048 merged | |
| `claude/e2e-route-tables-stand-in` | 2026-11-17 | yes | #1045 merged | |
| `claude/e2e-snap-preview-one-step` | 2026-11-17 | yes | #1043 merged | |
| `claude/e2e-terrain-stand-in` | 2026-11-17 | yes | #1047 merged | |
| `claude/e2e-turnstile-stand-in` | 2026-11-17 | yes | #1046 merged | |
| `claude/e2e-wait-map-settled` | 2026-11-17 | yes | #1042 merged | |
| `claude/phone-test-sheet-snaps` | 2026-11-17 | yes | #1049 merged | |
| `claude/phone-test-touch-only` | 2026-11-17 | yes | #1059 merged | |
| `claude/pill-burst-premise` | 2026-11-17 | yes | #1068 merged | |
| `claude/pin-actions` | 2026-11-17 | yes | #1060 merged | |
| `claude/probe-phone-touch-state` | 2026-11-17 | no | #1051 closed | |
| `claude/stop-notes-unavailable` | 2026-11-17 | yes | #1053 merged | |
| `claude/studio-wheel-glide-yields` | 2026-11-17 | yes | #1044 merged | |
| `claude/sw-basemap-stand-in` | 2026-11-17 | yes | #1063 merged | |
| `claude/terrain-listener-fix` | 2026-11-17 | yes | #1065 merged | |
| `claude/turnstile-states` | 2026-11-17 | yes | #1067 merged | |
| `claude/verify-function-grants` | 2026-11-17 | yes | #1055 merged | |
| `claude/watcher-completed-runs` | 2026-11-17 | yes | #1054 merged | |
| `claude/audit-worker-column` | 2026-11-18 | yes | #1066 merged | |
| `claude/docs-browser-scripts-offline` | 2026-11-18 | yes | #1077 merged | |
| `claude/emulator-findings` | 2026-11-18 | yes | #1075 merged | |
| `claude/emulator-hosts` | 2026-11-18 | yes | #1071 merged | |
| `claude/emulator-hosts-control` | 2026-11-18 | yes | #1072 merged | |
| `claude/emulator-ride-capture` | 2026-11-18 | yes | #1073 merged | |
| `claude/emulator-wifi-off` | 2026-11-18 | yes | #1074 merged | |
| `claude/own-tiles-fixtures` | 2026-11-18 | yes | #1070 merged | |
| `claude/sakay-hint` | 2026-11-18 | yes | #1081 merged | |
| `claude/stop-map-tab-loop` | 2026-11-18 | yes | #1080 merged | |
| `claude/storybook-outside-stand-ins` | 2026-11-18 | yes | #1069 merged | |
| `claude/tab-loop-contribute` | 2026-11-18 | yes | #1079 merged | |
| `claude/tab-loop-routes` | 2026-11-18 | yes | #1076 merged | |
| `claude/ticket-stop-map-tab-loop` | 2026-11-18 | yes | #1078 merged | |
| `claude/destination-row` | 2026-11-19 | yes | #1087 merged | |
| `claude/list-sheet-momentum` | 2026-11-19 | yes | #1101 merged | |
| `claude/overview-button` | 2026-11-19 | yes | #1095 merged | |
| `claude/redesign-icons` | 2026-11-19 | yes | #1084 merged | |
| `claude/redesign-tokens` | 2026-11-19 | yes | #1083 merged | |
| `claude/route-card-restyle` | 2026-11-19 | yes | #1089 merged, #781 merged | |
| `claude/route-redesign-livvic` | 2026-11-19 | yes | #1099 merged | |
| `claude/route-redesign-loop-pill` | 2026-11-19 | yes | #1096 merged | |
| `claude/route-redesign-more-routes` | 2026-11-19 | yes | #1091 merged | |
| `claude/route-redesign-ride-pills` | 2026-11-19 | yes | #1093 merged | |
| `claude/route-redesign-signboards` | 2026-11-19 | yes | #1094 merged | |
| `claude/route-redesign-spec` | 2026-11-19 | yes | #1082 merged | |
| `claude/route-redesign-spec-2` | 2026-11-19 | yes | #1085 merged | |
| `claude/route-redesign-tiles` | 2026-11-19 | yes | #1097 merged | |
| `claude/route-redesign-trip-ends` | 2026-11-19 | yes | #1090 merged | |
| `claude/route-to-via` | 2026-11-19 | yes | #1086 merged | |
| `claude/sheet-body-clears-footer` | 2026-11-19 | yes | #1092 merged | |
| `claude/sheet-momentum` | 2026-11-19 | yes | #1100 merged | |
| `claude/spec-overview-button` | 2026-11-19 | yes | #1088 merged | |
| `claude/timeline-restyle` | 2026-11-19 | yes | #1098 merged | |
| `claude/trip-open-fit` | 2026-11-19 | yes | #1102 merged | |
| `claude/height-hooks-ticket` | 2026-11-20 | yes | #1108 merged | |
| `claude/route-detail-shell` | 2026-11-20 | yes | #1104 merged | |
| `claude/route-redesign-ride-times-plan` | 2026-11-20 | yes | #1107 merged | |
| `claude/route-redesign-ticket-status` | 2026-11-20 | yes | #1105 merged | |
| `claude/route-redesign-token-inventory` | 2026-11-20 | yes | #1106 merged | |
| `claude/route-redesign-travel-time` | 2026-11-20 | yes | #1103 merged | |
| `claude/drop-inert-write-policies` | 2026-11-21 | yes | #1057 merged | |

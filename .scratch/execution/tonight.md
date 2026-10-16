# Tonight's run (2026-10-15, overnight)

The owner's calls before sleeping: **small fixes** and **ride start and end**, **one pull request per change**, stacked. Not tonight: the commuter rename, the driver app, the studio maps, train tracking.

**Nothing merges and nothing goes live.** The PRs target `staging`, as the repo's feature PRs do; the owner merges them and releases `staging` to `main`, which is what Cloudflare deploys. No database and no Figma changes tonight.

**Another session's PRs may merge into `staging` tonight** (the owner, 2026-10-15; #161, the map designs, is open). When one does, `staging` is merged into the stack's first branch and down the stack, conflicts resolved, checks run again.

## The stack, in merge order

Each branch starts from the one before it, so the PRs merge top to bottom. The first starts from `staging`.

| # | Branch | Change | Spec |
| --- | --- | --- | --- |
| 0 | `claude/plans` | The plans in `.scratch/` | `README.md` |
| 1 | `claude/figma-names` | RouteTripDetail → TimelineRouteDetailCard, TripTimeline → TimelineRouteDetail | `small-fixes` 3 |
| 2 | `claude/distance-tile` | "Kilometer" → "Distance" | `small-fixes` 1 |
| 3 | `claude/train-bound-words` | Trains say Northbound / Southbound (Eastbound / Westbound on LRT-2) | `small-fixes` 4 |
| 4 | `claude/jeep-switch-keeps-pick` | Papunta / Pabalik keeps a jeep's picked hintuan | `small-fixes` 2 |
| 5 | `claude/fold-says-stations` | "N more stations" on trains | `ride-start-and-end`, Decided |
| 6 | `claude/button-primary-small` | The Button primitive gains Primary Small | `ride-start-and-end`, Decided |
| 7 | `claude/ride-pill` | RouteTripLineDetailPill: code and pesos as two halves | `ride-start-and-end`, Decided |
| 8 | `claude/timeline-rail-pieces` | The rail's MiddleTop, MiddleBottom and Disconnected pieces | `ride-start-and-end`, The rail |
| 9 | `claude/ride-start-and-end` | Set as start, an end before the start on the same card, trains reset on SWITCH (a draft PR) | `ride-start-and-end` |

Renames go first so every later change lands in the renamed files. The biggest change goes last, so the small ones are done whatever happens to it.

## Every change, before its push

- `npm run check`: Prettier, lint, the build with `check-build.mjs`, and the unit tests.
- The headless suites the change touches (`phone-test`, `visitor-test`, `where-test`, the studio's), against `npm run dev`. On this machine they run with a preload that points Playwright at the installed Chromium (kept outside the repo).
- For a component (6 to 9): its stories built and screenshotted with Playwright and looked at, and a `ds-reviewer` pass until it says PASS (`.claude/skills/ds-component`).
- The diff read once more for anything CI would reject.

## Where the ds-component skill would stop and ask

It asks the owner twice per component: before coding, and after the reviewer's findings. The owner is asleep, so each component's PR carries both: the props, variants and states built, in Figma's names, and what the reviewer found and what was done about it.

## If something needs the owner

That change stops at what's done, says why in its PR, and the run goes on to the next change that doesn't depend on it. Nothing is guessed into a design.

## In the morning

A report at the end of this file: every PR in merge order, its checks, and anything waiting on the owner.

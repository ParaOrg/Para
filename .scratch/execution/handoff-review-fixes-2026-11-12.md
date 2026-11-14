# Handoff: the review-fixes builder, night of 2026-11-12

Written 2026-11-13 15:40 UTC. The session stopped running at about 15:10 UTC on 2026-11-12 and woke a day later, so it missed the wind-down window (20:00 to 21:00 UTC). It merged nothing after #980 and has started nothing since. Everything below is as it stands on `staging` at `a6de073e`.

## Merged into staging this round (47)

Night of 2026-11-12, in merge order:

- #958 Routes: a line read for an earlier load is never shown after a reload
- #959 Place search: Escape in the field is the field's alone
- #961 CI: a run on staging or main always finishes, in every workflow
- #963 Ticket: a suite for the basemap fallback, against the own-tiles stand-in
- #962 Map: fall back to OpenFreeMap when the basemap host fails
- #964 Watch: say when a publish reached main but not the live site
- #965 CI: one setup action for every browser suite
- #966 Build variables are read in the env modules alone, and lint holds it
- #949 Contributor app release: the APK is signed in a job of its own
- #967 Map: the failure box keeps its diagnostics for the studio
- #970 Lint: warn on type assertions, and the drawing folder has none
- #972 Ticket: a dry run of the app's signing, with nothing published
- #971 Nightly failures of Database, Security and CodeQL open an alert
- #974 Contributor app: a dry run of the signing, from main, with nothing published
- #975 Lint: no plain React.lazy outside the two places that need it
- #976 First visit: keep the first screen's tiles when the map's worker was left outside the offline worker
- #978 Phone-speed timer: a 3G profile beside Slow 4G
- #981 Docs: a split plan for the contributor page's one big component
- #980 CI: the summary jobs pass only on results they know
- #979 Privacy brief: an account's uploads always stay (merged 2026-11-13, not by this session; it had been waiting on the owner's answer)

Earlier in the round: #917, #918, #919, #921, #923, #924, #926, #927, #928, #929, #930, #931, #932, #937, #938, #939, #941, #942, #943, #945, #946, #947, #948, #950, #951, #953, #955.

Staging's own runs on #978's merge (`9df85ee1`) and on #980's merge (`e58781e3`, which also covers #981) both ended green. The session did not get to report those two to the hub.

## Open pull requests

| PR | State | Next step |
| --- | --- | --- |
| #977 Commuter suite: the sections one part runs move to the second part | Open, not merged. Head `f27c7a8f`. Its first CI run never ran (the reason #980 exists); the one re-run of the whole run was green: 27 jobs, 25 passed and 2 skipped. | `staging` has moved a long way since. Merge `staging` into the branch, let CI run, and check the full job count. Before merging, compare the three commuter jobs' PASS totals with `staging`'s latest run (they must be equal, with nothing skipped) and add the three durations to the body, as the body promises. For reference, the suite step took 754 s, 1181 s and 919 s for parts 1 to 3 in the re-run, against 1287 s, 1057 s and 1175 s on `staging` at `9df85ee1`; the runner matters more than the split. Its one re-run is used. |
| #922 Tiles: serve only from the custom domain | Draft. | Waits on the owner. |

## Waiting on the owner

- #922, above.
- The `app-release` environment should allow only `main` and `app-v*` tags (named in #974; a repository setting, not changed by any session).
- Applying migrations: the two database branches below are written and not applied. The owner applies.

## Ready on a branch, not opened

Each branch is pushed. "Refreshed" means `staging` was merged in and `npm run check` passed at that commit; all of them need `staging` merged in again before opening.

| Branch | What it is | To know before opening |
| --- | --- | --- |
| `claude/save-drafts-fallback-scoped` (`4bf9267c`, on `e58781e3`) | save-drafts-test: a late sidebar is waited for, and the fallback row is looked for in the chooser only. The hub asked for it after the suite timed out once on #980. | Proven before the fix was written: with the main thread slowed 20 times during the second edit of the saved hintuan, the unchanged suite fails with the same error CI showed (58 checks pass, then a 30 s click timeout on the map's draft label); with the fix it passes 68 of 68 at 20 times and at 60 times, and with nothing forced. No check is removed or changed. Full suite. The same instant read of the sidebar is in `studio-contributors-test` and `studio-two-editors-test`; not touched. |
| `claude/content-policy-report-only` (`967172a3`, on `9df85ee1`) | Headers: a report-only content policy for the public map, the studio and the contributor page. | `/app/` is sent no policy on purpose, and `public/_headers` says so in a TODO: the waitlist form went onto that page afterwards (#944). Run pwa-test, handover-test and contribute-offline-test on a build again after merging `staging` (they were 45, 13 and 18, nothing flagged). It touches `vite.config.ts` and `scripts/checks/`, so the config rule applies to pull requests in flight when it merges. |
| (not started) | A content policy for `/app/`, written from the page as it ships: Turnstile's script and frame, the database, and its inline script by hash, checked on a build. | Follows the branch above. |
| `claude/verify-function-grants` (`73d68b97`, on `4feb77e0`) | Database checks: verify which functions the public role may call. | #944 changed `supabase/verify/README.md` and `run.sh`; expect a conflict to resolve. |
| `claude/drop-unused-link-row` (`c7f463fb`, on `4feb77e0`) | Removes an unused schema from `hotspot-schema.ts`. No caller in `src/`, `scripts/`, `tests/`, `workers/` or `android/`. | A plain code tidy, not a migration. |
| `claude/route-end-indexes` (`5eeda068`) | Database: indexes for a route's ends. Migration with its apply, check and revert files. | Open as a draft. Written, not applied. |
| `claude/drop-inert-write-policies` (`1bfbe73b`) | Database: drop write policies that no longer do anything. Migration with its apply, check and revert files. | Open as a draft. Written, not applied. |
| `claude/spike-build-per-page` (`bcd7c956`) | A spike: one build per page. | Open as a draft; it is a question, not a change to ship. |

## Not on a branch

- CI: pin actions to commit SHAs. It was to go last because it touches every workflow. The session's script for it lived in its own scratch space and is gone with the session; it rewrote each `uses:` line to the commit behind its tag, with the tag kept in a comment.
- Lint: 43 type assertions in 21 files still warn (#970). Each later pull request clears one folder; the last one turns the rule into an error.

## Rules that changed tonight, for whoever picks this up

- Until every open pull request has `staging` at `e58781e3` or later in its run, a green pair of summary checks is not proof the suites ran. Read the run's job count: 35 for a full suite, 10 (3 passed, 7 skipped) for a docs-only change.
- After a pull request that touches `.github/` merges, nothing else touching `.github/` merges until `staging`'s own run on that merge is green.

# Failure ledger

One line per red job on `staging` or `main` (item 12 of `../ci-speed/phase-2-plan.md`). The cause says what it was:

- **caught a regression:** the app broke, and the check caught it.
- **caused by a change:** a change to a test or the workflow broke the check, not the app.
- **flake:** it failed without any change, and passed again unchanged.

The fix names the pull request that turned it green.

| Date | Run | Job | Check | Cause | Fix |
| --- | --- | --- | --- | --- | --- |
| 2026-11-22 | push 45069730721, 8edfb8c | contribute-test | "and run out, the form saves": no "Route recorded" toast after a stop's map closed | caused by a change: #1156 swapped `runFor` for `fastForward`, and its single tick raced the passive effects that release the form's hold | #1158 reverted it |
| 2026-11-22 | push 45071761802, 89adf45 | account-test, forgot-password-test, claim-test | account-test: "a session Para has not yet said is still there: its recording stays on the phone, not sending", with an empty card read | a race in the test: the History card's text was read right after the card attached, before its words were drawn. The app was right: the next check, 0 uploads, passed. The race predates today: the same tree was green at 73f1c13 | #1159 waits for the card's status words before reading |
| 2026-11-25 | pull_request 45638961323, 2e97035 (#1217, on staging 90a31dd) | Formatting and the unit checks (job 139292085496) | unnamed: the unit checks exited 1, but the log kept only the first 64 KiB of their output (cut mid-line at "ok 273 - a curve is a Draw str"), so the failing test and the summary were lost | unknown. The cut was side-by-side.mjs exiting before its report drained, fixed in #1221. The failure did not reproduce with CI's command on 2 cores (2052/2052), and #1217 has been green since (69def97, 7570625). Suspected, not shown: store-search-test's keystroke timing on a loaded runner | none yet. Watch: the next red shows its name |
| 2026-11-27 | merge_group 45977104774, 52bcbe7 (#1285, on staging bd16f21) | Formatting and the unit checks (job 140431532498) | store-search-test "over the real files, the read and a search stay quick": '"purg" took 104 ms, over the 100 a keystroke may' | flake: the keystroke timing on a loaded runner, the median of three runs at 104 ms against 100 (the cause suspected on 2026-11-25 above, now shown). #1285 changes only the dev server's watch list, which no unit check loads; the test passed 5 of 5 runs locally | fixed: median of 7 runs, limit unchanged (this PR) |
| 2026-11-27 | merge_group 45927406469, 2c4939c (#1264) | save-drafts-test (job 140271958156) | the reload after the signboard upload: `page.waitForFunction: Timeout 30000ms exceeded` at `load` | flake, cause shown later: the reload opens into a drawing, whose flowing chevrons re-set `draw-arrows` every frame, so `map.loaded()` is true only between frames (issues/09) | still chevrons in the suite (issues/09's PR) |
| 2026-11-27 | merge_group 45995026745, 22a0b0b (#1289) | save-drafts-test (job 140492554705) | the same step and timeout | flake: the same cause (issues/09). #1289 passed on its next queue run | as above |

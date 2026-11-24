# CI failure ledger

Item 12 of [phase-2-plan.md](phase-2-plan.md): every red CI job, with its cause, for two weeks from 2026-11-22 to 2026-12-06. It covers pushes to `staging` and pull requests into it. The point is evidence: which suites fail without a code reason (flakes), and which fail only because of their stand-ins. Section 5.11 ("fewer tests, on evidence") and the flake tickets in [`../ci-flakes/issues/`](../ci-flakes/issues/) read it.

## What counts

- **Every job with conclusion `failure` or `cancelled`** in a run of `CI`, `Contributor app`, `Database`, `Security` or `CodeQL`, on a pull request into `staging` or a push to it. Scheduled runs and `main` are left out unless they share a cause with a row here.
- **A summary job** ("Build and the public map", whose `RESULTS` line lists its parts) goes in the same row as the part that failed, not a row of its own.
- **One row per failed job per run.** A job that fails again on the next run gets a new row.

## Causes

| Cause | Means | Evidence a row needs |
| --- | --- | --- |
| real | The change under test was wrong: the code, or the suite the change adds or edits | The commit that fixed it |
| flake | The same code passes with nothing relevant changed, or the job fails on unchanged `staging` | A pass on the same code, or the failing check reproduced on `staging`; a ticket in `ci-flakes/issues/` once seen twice |
| stand-in | A stand-in answered wrong or not at all: a recorded router, the basemap stand-in, the Supabase stand-in. "stand-ins have no answer" in the log is the usual sign | The stand-in and the request it missed |
| runner | The runner itself: setup, a download, the disk, a cancelled job | The step that failed |
| unknown | Not read yet | Becomes one of the above within a day |

## How it is kept up

- **Who:** whichever session watches a run that goes red adds the row the same day, with the run link and the first failure line. A ci-watcher's report already gives both. The hub checks the ledger before it says "go" to a merge.
- **Sweep:** once a day, the hub or a session it names lists the day's red runs, then reads each failed job's first `FAIL` line, to catch any run nobody watched:

  ```sh
  gh api -X GET repos/ParaOrg/Para/actions/runs -f created='>=YYYY-MM-DD' -f per_page=100 --paginate \
    -q '.workflow_runs[] | select(.conclusion=="failure" or .conclusion=="cancelled") | "\(.id) \(.name) \(.event) \(.head_branch)"'
  gh api repos/ParaOrg/Para/actions/runs/<run>/jobs --paginate \
    -q '.jobs[] | select(.conclusion=="failure") | "\(.id) \(.name)"'
  ```

- **Never a rerun to fill a row.** Re-running CI to see whether it flakes is a retry, and the rules forbid it. A flake is shown by the next run on the same code, or by a local run on `staging`.
- **At the end (2026-12-06):** a summary at the top. It gives the red jobs by cause and by suite, which flakes have tickets, and what section 5.11 can drop or must fix.

## Ledger

| Date (UTC) | Run | Event, branch | Job | First failure line | Cause | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-11-22 | [44980317006](https://github.com/ParaOrg/Para/actions/runs/44980317006) | pull request #1129, `claude/retire-pwa` | retire-pwa-test (and the summary "Build and the public map") | `FAIL the suite ran to the end page.waitForEvent: Timeout 20000ms exceeded while waiting for event "framenavigated"` | real | The suite was new in #1129. Its next commit, 8fbf630 ("retire-pwa-test: block other hosts in the browser, not by a request route"), changed only that suite, and run 44983010389 passed |
| 2026-11-22 | [44994857857](https://github.com/ParaOrg/Para/actions/runs/44994857857) | pull request #1133, `claude/folders-sheet-header` | commuter-test (4 of 6) (and the summary "Build and the public map") | `Error: shows: nothing matched [data-testid="card"]:not([hidden]) [data-testid="card-place"] within 3000 ms`, after 456 checks passed, at the empty-map tap that leaves a trip for its place's card | flake, likely | #1133 moves only studio code and two stories; the step is the public map's. The same commit's part 4 passed 4 times out of 4 locally, 492 checks each (the step passed for all 21 places each time). The step is new in the suites since 2026-11-21 (c1c0c8c7). A ticket in `ci-flakes/issues/` if it shows again |
| 2026-11-23 | [45095953134](https://github.com/ParaOrg/Para/actions/runs/45095953134) | push, `staging` (85f8d6b, after #1155) | save-ikot-test (and the summary "The editor") | `locator.click: Timeout 30000ms exceeded … waiting for getByRole('button', { name: 'New route, terminal or hintuan' })` at save-ikot-test.mjs:272, right after `approveAll()` reloads the studio | app race, fixed by #1173 (first read as a flake; owner-approved re-run) | The New button never drew in 30 s after the reload; it is hidden only while drawing or while the route list asks which line. The run kept no screenshot, only vite.log. #1155's PR run on the same tree passed save-ikot-test and The editor; 2 of 2 local runs at 85f8d6b passed. The owner allowed one re-run of the failed jobs (an exception to the rule above): attempt 2 passed. A ticket in `ci-flakes/issues/` if it shows again. Follow-up: save-ikot-test should keep a screenshot on failure, which would have shown what hid the button. **Cause, found 2026-11-23:** a save's toast was drawn while the studio still kept the drawing on the device (`para.draft.v1`), cleared a moment later by an effect; `approveAll`'s reload could land in that gap, and the studio restored the saved drawing, whose toolbar hides New and the route's card. Locally, three runs at once: 1 of 20 failed on `staging` f274a47 and 3 of 20 on 4e62a37. Putting the drawing back just before the reload failed every time with this line. #1173 clears the draft as the drawing ends, adds a check that it is gone when the toast shows, and makes the save suites keep a screenshot and a trace on failure: 0 of 21 failed after it |
| 2026-11-23 | [45098774997](https://github.com/ParaOrg/Para/actions/runs/45098774997) | push, `staging` (13004a4, after #1168) | Storybook plays (and the summary "Build and the public map") | `FAIL Features/Routes/PlaceSearch › Long Names On Phone … Unable to find an accessible element with the role "option"` | real (in the test), pre-existing, not #1168 | The search rows render one step behind the typing (`useDeferredValue` in `use-search-rows.ts`, since #1015), and 8 PlaceSearch plays read the rows straight after `userEvent.type`. #1168 touches no search code. Fixed test-only in `claude/search-plays-wait-rows`: the 8 reads wait with `waitFor`, at its default timeout. The PlaceSearch plays, 15 runs × 12 workers: 1 of 15 failed on `staging` (Typing, the same race), 0 of 15 on the fix |
| 2026-11-23 | [45221124122](https://github.com/ParaOrg/Para/actions/runs/45221124122) | pull request #1178, `claude/arrows-rest-after-flow` (c1ecd7b) | emulator-notification (Contributor app; job 137855337903) | `FAIL: opened, the card's bars are '' and '', not Pause and Sakay`, then `no Sakay bar on the screen to tap` and `the page reads the ride as 'ride=finished:modes=1:gaps=2', not ride=finished:modes=2:gaps=2` | flake, likely | The ride notification's bars came up empty on the emulator. #1178 changes only `direction-arrows.ts` and two test files; nothing the contributor app imports. The app's web side (`vite.apk.config.ts`) built on `staging` f4b49b3 and on this branch is byte-identical (`diff -r`), so the emulator ran the same app `staging` passes with. It is the only failure in the workflow's last 200 completed runs (2026-11-13 to 2026-11-23). The owner allowed one re-run of this job only (an exception to the rule above): attempt 2 passed (job 138214937491), and #1178 merged. A ticket in `ci-flakes/issues/` if it shows again |

## Known, not yet seen here

- **phone-test, "a tap reaches … (Close|Back)":** fails now and then on unchanged `staging` locally. It hasn't failed in CI yet. See [`../ci-flakes/issues/07-phone-test-close-back-tap.md`](../ci-flakes/issues/07-phone-test-close-back-tap.md). A row goes here if CI ever shows it.

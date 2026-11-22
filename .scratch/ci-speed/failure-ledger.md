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

## Known, not yet seen here

- **phone-test, "a tap reaches … (Close|Back)":** fails now and then on unchanged `staging` locally. It hasn't failed in CI yet. See [`../ci-flakes/issues/07-phone-test-close-back-tap.md`](../ci-flakes/issues/07-phone-test-close-back-tap.md). A row goes here if CI ever shows it.

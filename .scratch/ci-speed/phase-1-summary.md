# CI speed, Phase 1: what changed

Free changes only: no new runners, accounts or dependencies. Every test still runs. No check was removed, skipped, retried or given a longer timeout.

A full CI run on staging now takes **11.4 minutes**, down from 23–24. A pull request run took **11.6 minutes**, the first measured after the change. The baseline was a median of 26.1 minutes over 40 runs.

## Before and after

Full runs on staging (run 43562391809 before, 43868373251 after):

| | Before | After |
| --- | --- | --- |
| Time from push to result | 23.0 min | 11.4 min |
| Slowest single job | phone-test, 21.6 min | a commuter-test part, 9.0 min |
| Work done per run (job-minutes) | 143 | about 124 |
| Jobs per run | 35 | 31 |

## What made the difference

1. **A test bug (#1011).** 36 test calls moved the map and accidentally sent the whole map object back to the test runner, 1–4 seconds each time. Fixing it cut 15% of all CI work; commuter-test alone got 31% faster. A lint rule keeps it from coming back.
2. **Jobs sized by measured time (#1014).**
   - commuter-test runs in 6 parts and the drawing tests in 2.
   - The small suites share jobs, since every job repeats its setup and waits for one of about 20 free runners.
   - Dependabot opens at most 3 npm updates at a time (was 5), and 1 GitHub Actions update, on Thursdays.
3. **phone-test in 3 parts (#1015).** A script compares every check name and proves the parts run exactly the same 201 checks as one full run.
4. **Written down (#1013).** A CI change merges on its own and is proven on staging before anything else merges (`docs/agents/how-we-work.md`).
5. **Path selection (#1016).** CI picks the suites a pull request runs from the files it changes. It could skip the drawing tests for changes to files they depend on; now it runs them. Shared code still relies on staging's full run, on purpose: running the drawing tests on nearly every pull request would cost about 11 job-minutes each.

## Found along the way

- **No app bugs affecting real users.** A suspected touch problem on the sheet's handle turned out to be the test browser's touch emulation, not the app (two diagnostic runs; `.scratch/ci-speed/phone-test-sheet-snap.md`).
- **Decision 1, for the owner.** About 60 phone-test taps hit stop rows that sit below the screen when the card is at its lowest position (Low). A person would drag the card up first. Should those checks run with the card raised, as a person would use it? The recommendation is yes. Write-up: `.scratch/ci-speed/phone-test-sheet-snap.md`.
- **Decision 2, for the owner.** The drawing tests call a free public route-snapping service live, and retry once when it is busy (2 times in the last 40 runs). The option is recorded answers on pull requests, with the live service on staging, main and the nightly run.
- **Decision 3, for the owner (not acted on).** commuter-test checks every interaction on all ~140 hotspots, which is most of its cost. Testing fewer, or with reduced motion, would be faster but test less.

## Honest limit

About 11–12 minutes is the floor for now. CI does about 124 job-minutes of work per run on roughly 20 free runners, so a second wave of jobs waits 1–2 minutes when other runs are queued. There are two ways lower:

- **Less work per run:** decisions 1–3.
- **Phase 2, faster or more runners:** a cost decision for the owner. Nothing is planned.

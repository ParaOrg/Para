# Check times

Phase 2, item 1 (`../phase-2-plan.md`, section 7): how long each part and each check of a full run takes, so parts can be balanced and slow waits found by measurement.

There is no change to the suites or the workflow. GitHub stamps every line of a job's log with the time it was written. A check's time is the time from the line before it that marks progress (the previous check, or its step's start) to its own `PASS`, `FAIL` or `SKIP` line. The logs are kept for 90 days, and `out/` keeps what was read from them.

```
node fetch-logs.mjs <run id>              # gh api, read-only: logs/<run id>/jobs.json and <job id>.txt
node check-times.mjs logs/<run id>        # out/<run id>.md and out/<run id>.json
```

`logs/` is not committed. Record a full run (a push to `staging`, or the nightly run) before and after a change that should move these numbers.

**What a check's time includes:** everything between two check lines, the waits and the page's work alike. So the first check of a section carries the section's setup, and the first check of a step carries the browser's launch. "Before the suite" is a job's time to its first step that printed a check: runner setup, `npm ci`, the browser and the dev server.

## First reading: run 44974645918 (staging at 487f224, 22 November)

This was a full run, all 32 jobs green. It read 4,848 checks in 27 jobs: [`out/44974645918.md`](out/44974645918.md).

**The long pole is commuter-test, not phone-test.**

- **commuter-test:** its six parts take 6m42s to 8m19s each.
- **phone-test:** its three parts take 5m06s, 4m22s and 3m23s. The plan's 3m57s / 5m03s / 8m01s came from the audit's earlier window of runs.
- **Item 2 of the plan:** balancing phone-test's parts would not shorten the run today.
- **The next longest jobs:** the first drawing part at 6m51s, and contribute-test at 6m33s.

**Where commuter-test's time goes.** Its 2,880 checks take 0.9 s each on average, about 2,600 s in all. The per-hotspot checks, summed over the six parts:

| Seconds | Times | Mean | Check |
| --- | --- | --- | --- |
| 442 | 121 | 3.65 | a row tapped at rest: the trip opens taking in its route, and leaving it brings the camera back |
| 313 | 100 | 3.13 | ⇄ turns the routes round with the camera kept still, there and back |
| 278 | 100 | 2.78 | and each route keeps its colour turned round, there and back, and round again |
| 277 | 121 | 2.29 | a second tap on a picked card lets it go: every route lit again |
| 260 | 121 | 2.15 | ✕ closes it all: nothing lit |
| 177 | 121 | 1.46 | its first route row opens a route card straight away |
| 166 | 121 | 1.37 | a tap on its first card selects it and lights just its routes |

These seven checks take about 1,900 of those 2,600 seconds. Item 3 (fixed waits replaced by waits on a real condition) starts with them.

Since #1137 (22 November) these checks no longer run in CI: hotspot taps are off unless `VITE_HOTSPOT_TAPS=1`. commuter-test's parts now take 2m03s at most. The long pole on a pull request is contribute-test, at about 6.5 minutes.

**phone-test** has few checks, but long ones: 30 to 84 checks a part, 3.4 to 6.2 s each on average. Its slowest are stop lists and taps across a whole trip, such as "every stop shows, in reach, and nothing folds" at 40.7 s.

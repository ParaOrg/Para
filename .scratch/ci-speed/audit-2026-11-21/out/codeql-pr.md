# codeql-pr: 150 runs, 2026-11-14T03:21:22Z to 2026-11-21T05:31:32Z (7.09 days, 21.2 runs/day)

Conclusions: {"success":148,"cancelled":2}. Runs with run_attempt > 1: 0. Jobs without created_at: 0 of 450.

## Time to result (run created to the last required job finished)

| Set | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| Every run with a verdict | 0 | – | – | – |
| …of the current job layout only | 0 | – | – | – |
| Whole run (created to updated_at), verdict runs | 0 | – | – | – |
| Run created to first job created, all runs | 150 | 1 s | 1 s | 14 s |

## The critical chain, bucket by bucket (verdict runs)

| Bucket | p50 | p95 | mean |
| --- | --- | --- | --- |
| beforeFirstJob | – | – | – |
| waiting | – | – | – |
| setup | – | – | – |
| running | – | – | – |
| handoffs | – | – | – |


Job that set the result time (the last to finish before the summary job), by count: 

## Every job: waiting / setup / running (p50 / p95)

| Job | group | ran | failed | cancelled | skipped | waiting | setup | running | whole job |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CodeQL (javascript-typescript) | other | 148 | 0 | 2 | 0 | 2 s / 2m26s | 19 s / 33 s | 58 s / 74 s | 81 s / 96 s |
| CodeQL (actions) | other | 149 | 0 | 1 | 0 | 2 s / 2m43s | 14 s / 28 s | 26 s / 31 s | 42 s / 54 s |

## By group (every job of the group pooled)

| Group | jobs | waiting | setup | running | whole job |
| --- | --- | --- | --- | --- | --- |
| other | 297 | 2 s / 2m43s | 17 s / 30 s | 41 s / 71 s | 58 s / 93 s |
| ALL | 297 | 2 s / 2m43s | 17 s / 30 s | 41 s / 71 s | |

Summed over every job that ran to a result: waiting 155 min, setup 90 min, running 214 min.

## Steps (p95 of 2 s or more)

| group :: step | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| other :: Run actions/checkout@<sha> | 133 | 2 s | 7 s | 8 s |
| other :: Run actions/checkout@v7 | 164 | 2 s | 6 s | 9 s |
| other :: Run github/codeql-action/analyze@<sha> | 133 | 27 s | 70 s | 73 s |
| other :: Run github/codeql-action/analyze@v4 | 164 | 38 s | 64 s | 2m59s |
| other :: Run github/codeql-action/init@<sha> | 133 | 14 s | 19 s | 25 s |
| other :: Run github/codeql-action/init@v4 | 164 | 13 s | 22 s | 31 s |
| other :: Set up job | 297 | 1 s | 3 s | 5 s |

## Setup steps and first work step, per job

- **CodeQL (javascript-typescript)**: setup = Set up job; Run actions/checkout@<sha>; Run github/codeql-action/init@<sha>; Run actions/checkout@v7; Run github/codeql-action/init@v4. First work step: Run github/codeql-action/analyze@33d7b85da1a04171e211befe2c739303b9a4c066 | Run github/codeql-action/analyze@v4
- **CodeQL (actions)**: setup = Set up job; Run actions/checkout@<sha>; Run github/codeql-action/init@<sha>; Run actions/checkout@v7; Run github/codeql-action/init@v4. First work step: Run github/codeql-action/analyze@33d7b85da1a04171e211befe2c739303b9a4c066 | Run github/codeql-action/analyze@v4

## Failures

Failed jobs by count: none

## Billed minutes

Sum of each job rounded up to the minute: 446 min over 150 runs (3 per run), 63 per day, 1887 per 30 days at this rate. By runner: {"ubuntu-latest (GitHub Actions)":442,"ubuntu-latest ()":4}.

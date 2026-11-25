# security-pr: 150 runs, 2026-11-14T03:20:49Z to 2026-11-21T05:31:32Z (7.09 days, 21.2 runs/day)

Conclusions: {"success":148,"cancelled":2}. Runs with run_attempt > 1: 0. Jobs without created_at: 0 of 600.

## Time to result (run created to the last required job finished)

| Set | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| Every run with a verdict | 0 | – | – | – |
| …of the current job layout only | 0 | – | – | – |
| Whole run (created to updated_at), verdict runs | 0 | – | – | – |
| Run created to first job created, all runs | 150 | 1 s | 1 s | 3 s |

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
| No secrets in the history | other | 149 | 0 | 1 | 0 | 2 s / 3m05s | 5 s / 14 s | 3 s / 5 s | 9 s / 18 s |
| No known holes in production dependencies | other | 148 | 0 | 2 | 0 | 2 s / 3m37s | 4 s / 14 s | 4 s / 5 s | 8 s / 18 s |

## By group (every job of the group pooled)

| Group | jobs | waiting | setup | running | whole job |
| --- | --- | --- | --- | --- | --- |
| other | 297 | 2 s / 3m28s | 5 s / 14 s | 3 s / 5 s | 8 s / 18 s |
| ALL | 297 | 2 s / 3m28s | 5 s / 14 s | 3 s / 5 s | |

Summed over every job that ran to a result: waiting 182 min, setup 30 min, running 17 min.

## Steps (p95 of 2 s or more)

| group :: step | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| other :: npm audit | 148 | 1 s | 2 s | 3 s |
| other :: Run actions/cache@<sha> | 67 | 1 s | 3 s | 3 s |
| other :: Run actions/cache@v6 | 82 | 1 s | 3 s | 4 s |
| other :: Run actions/checkout@<sha> | 133 | 2 s | 6 s | 9 s |
| other :: Run actions/checkout@v7 | 164 | 2 s | 6 s | 11 s |
| other :: Run actions/setup-node@<sha> | 66 | 1 s | 5 s | 7 s |
| other :: Run actions/setup-node@v7 | 82 | 1 s | 5 s | 11 s |
| other :: Set up job | 297 | 1 s | 3 s | 7 s |

## Setup steps and first work step, per job

- **No secrets in the history**: setup = Set up job; Run actions/checkout@<sha>; Run actions/cache@<sha>; Run actions/checkout@v7; Run actions/cache@v6. First work step: Install gitleaks
- **No known holes in production dependencies**: setup = Set up job; Run actions/checkout@<sha>; Run actions/setup-node@<sha>; Run actions/checkout@v7; Run actions/setup-node@v7. First work step: npm audit

## Failures

Failed jobs by count: none

## Billed minutes

Sum of each job rounded up to the minute: 302 min over 150 runs (2 per run), 43 per day, 1278 per 30 days at this rate. By runner: {"ubuntu-latest (GitHub Actions)":298,"ubuntu-latest ()":4}.

# contributor-app-pr: 150 runs, 2026-11-11T18:58:41Z to 2026-11-20T02:02:48Z (8.29 days, 18.1 runs/day)

Conclusions: {"success":126,"cancelled":24}. Runs with run_attempt > 1: 3. Jobs without created_at: 0 of 1116.

## Time to result (run created to the last required job finished)

| Set | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| Every run with a verdict | 0 | – | – | – |
| …of the current job layout only | 0 | – | – | – |
| Whole run (created to updated_at), verdict runs | 0 | – | – | – |
| Run created to first job created, all runs | 150 | 1 s | 7 s | 157m16s |

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
| emulator-ride | other | 126 | 0 | 24 | 0 | 28 s / 3m56s | 47 s / 74 s | 24m15s / 25m05s | 25m00s / 26m13s |
| emulator-notification | other | 134 | 0 | 16 | 0 | 18 s / 4m44s | 45 s / 78 s | 10m29s / 10m47s | 11m14s / 12m03s |
| apk | other | 145 | 0 | 5 | 0 | 14 s / 4m11s | 44 s / 77 s | 46 s / 56 s | 90 s / 2m14s |

## By group (every job of the group pooled)

| Group | jobs | waiting | setup | running | whole job |
| --- | --- | --- | --- | --- | --- |
| other | 405 | 19 s / 4m11s | 45 s / 77 s | 10m28s / 24m51s | 11m09s / 25m57s |
| ALL | 405 | 19 s / 4m11s | 45 s / 77 s | 10m28s / 24m51s | |

Summed over every job that ran to a result: waiting 476 min, setup 323 min, running 4594 min.

## Steps (p95 of 2 s or more)

| group :: step | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| other :: Build the contributor page for the app | 145 | 2 s | 2 s | 2 s |
| other :: Build the debug APK | 145 | 26 s | 33 s | 97 s |
| other :: Build the page with the ride's driver, and the debug APK | 260 | 27 s | 36 s | 1m41s |
| other :: Post Run ./.github/actions/prepare-app-build | 405 | 1 s | 2 s | 5 s |
| other :: Ride with the screen off | 126 | 23m05s | 23m46s | 23m57s |
| other :: Run ./.github/actions/prepare-app-build | 405 | 42 s | 73 s | 98 s |
| other :: Run ./.github/actions/prepare-emulator | 260 | 37 s | 45 s | 60 s |
| other :: Run actions/checkout@<sha> | 116 | 2 s | 6 s | 7 s |
| other :: Run actions/checkout@v7 | 289 | 2 s | 4 s | 7 s |
| other :: Run actions/upload-artifact@<sha> | 116 | 2 s | 3 s | 3 s |
| other :: Run actions/upload-artifact@v7 | 289 | 2 s | 2 s | 5 s |
| other :: Set up job | 405 | 1 s | 2 s | 4 s |
| other :: Tap the ride's notification | 134 | 9m20s | 9m32s | 9m43s |
| other :: Test the ride's rules (JUnit) | 145 | 12 s | 15 s | 19 s |

## Setup steps and first work step, per job

- **emulator-ride**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-app-build; Run ./.github/actions/prepare-emulator; Run actions/checkout@v7. First work step: Build the page with the ride's driver, and the debug APK
- **emulator-notification**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-app-build; Run ./.github/actions/prepare-emulator; Run actions/checkout@v7. First work step: Build the page with the ride's driver, and the debug APK
- **apk**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-app-build; Run actions/checkout@v7. First work step: Build the contributor page for the app

## Failures

Failed jobs by count: none

## Billed minutes

Sum of each job rounded up to the minute: 5442 min over 150 runs (36.3 per run), 656 per day, 19683 per 30 days at this rate. By runner: {"ubuntu-latest (GitHub Actions)":5392,"ubuntu-latest ()":50}.

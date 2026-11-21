# database-pr: 100 runs, 2026-11-06T07:31:19Z to 2026-11-21T05:31:32Z (14.92 days, 6.7 runs/day)

Conclusions: {"success":96,"failure":4}. Runs with run_attempt > 1: 2. Jobs without created_at: 0 of 236.

## Time to result (run created to the last required job finished)

| Set | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| Every run with a verdict | 0 | – | – | – |
| …of the current job layout only | 0 | – | – | – |
| Whole run (created to updated_at), verdict runs | 0 | – | – | – |
| Run created to first job created, all runs | 100 | 1 s | 1 s | 27m43s |

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
| Review suites on the isolated preview | other | 100 | 4 | 0 | 0 | 16 s / 4m33s | 53 s / 3m28s | 5m07s / 6m04s | 6m06s / 8m35s |
| Migrations and row security on a throwaway Postgres | other | 100 | 0 | 0 | 0 | 16 s / 4m19s | 1 s / 2 s | 5m06s / 5m45s | 5m07s / 5m47s |

## By group (every job of the group pooled)

| Group | jobs | waiting | setup | running | whole job |
| --- | --- | --- | --- | --- | --- |
| other | 200 | 16 s / 4m26s | 4 s / 77 s | 5m06s / 5m57s | 5m28s / 7m06s |
| ALL | 200 | 16 s / 4m26s | 4 s / 77 s | 5m06s / 5m57s | |

Summed over every job that ran to a result: waiting 255 min, setup 128 min, running 1009 min.

## Steps (p95 of 2 s or more)

| group :: step | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| other :: Build the preview and start its server | 98 | 5 s | 6 s | 6 s |
| other :: Initialize containers | 100 | 9 s | 15 s | 17 s |
| other :: Install Chromium's system packages | 13 | 3 s | 19 s | 19 s |
| other :: Make the preview database | 98 | 2 s | 3 s | 6 s |
| other :: review-publication-test | 98 | 4 s | 5 s | 5 s |
| other :: review-test | 98 | 17 s | 27 s | 30 s |
| other :: Run ./.github/actions/prepare-browser-suite | 37 | 22 s | 68 s | 70 s |
| other :: Run actions/cache@v6 | 26 | 2 s | 6 s | 6 s |
| other :: Run actions/checkout@<sha> | 10 | 3 s | 6 s | 6 s |
| other :: Run actions/checkout@v7 | 190 | 2 s | 3 s | 7 s |
| other :: Run actions/setup-node@<sha> | 5 | 2 s | 6 s | 6 s |
| other :: Run actions/setup-node@v7 | 158 | 2 s | 6 s | 13 s |
| other :: Run npm ci | 63 | 37 s | 45 s | 48 s |
| other :: Run npm ci --ignore-scripts | 100 | 29 s | 45 s | 51 s |
| other :: Run npx playwright install --with-deps chromium | 50 | 17 s | 9m41s | 10m19s |
| other :: Set up job | 200 | 1 s | 2 s | 4 s |
| other :: Start PostgREST | 98 | 3 s | 3 s | 8 s |
| other :: Start the disposable database | 99 | 12 s | 17 s | 19 s |
| other :: supabase/verify/run.sh | 100 | 4m23s | 5m03s | 5m22s |
| other :: supabase/verify/run.sh on it | 99 | 4m28s | 5m01s | 5m30s |

## Setup steps and first work step, per job

- **Review suites on the isolated preview**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Run actions/checkout@v7; Run actions/setup-node@v7; Run npm ci; Run actions/cache@v6; Install Chromium's system packages; Run npx playwright install --with-deps chromium. First work step: Start the disposable database | Run echo "version=$(node -p "require('playwright/package.json').version")" >> "$GITHUB_OUTPUT" | The preview's logs
- **Migrations and row security on a throwaway Postgres**: setup = Set up job; Run actions/checkout@<sha>; Run actions/setup-node@<sha>; Run actions/checkout@v7; Run actions/setup-node@v7. First work step: Initialize containers

## Failures

Failed jobs by count: Review suites on the isolated preview 4

## Billed minutes

Sum of each job rounded up to the minute: 1241 min over 100 runs (12.4 per run), 83 per day, 2496 per 30 days at this rate. By runner: {"ubuntu-latest (GitHub Actions)":1241}.

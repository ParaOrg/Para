# ci-push-staging: 50 runs, 2026-11-17T16:55:07Z to 2026-11-20T03:30:07Z (2.44 days, 20.5 runs/day)

Conclusions: {"success":48,"failure":2}. Runs with run_attempt > 1: 0. Jobs without created_at: 0 of 1550.

## Time to result (run created to the last required job finished)

| Set | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| Every run with a verdict | 50 | 13m10s | 18m43s | 25m25s |
| …of the current job layout only | 50 | 13m10s | 18m43s | 25m25s |
| Whole run (created to updated_at), verdict runs | 50 | 13m11s | 18m43s | 25m26s |
| Run created to first job created, all runs | 50 | 1 s | 1 s | 2 s |
| scope: public+studio+contribute+drawing+build (jobs ran p50 31) | 50 | 13m10s | 18m43s | 25m25s |

## The critical chain, bucket by bucket (verdict runs)

| Bucket | p50 | p95 | mean |
| --- | --- | --- | --- |
| beforeFirstJob | 1 s | 1 s | 1 s |
| waiting | 3m18s | 8m40s | 3m50s |
| setup | 69 s | 84 s | 79 s |
| running | 8m26s | 10m44s | 8m33s |
| handoffs | 1 s | 2 s | 1 s |

- scope public+studio+contribute+drawing+build (n=50): beforeFirstJob 1 s/1 s, waiting 3m18s/8m40s, setup 69 s/84 s, running 8m26s/10m44s, handoffs 1 s/2 s

Job that set the result time (the last to finish before the summary job), by count: commuter-test (1 of 6) 9; phone-test (3 of 3) 9; commuter-test (5 of 6) 8; commuter-test (2 of 6) 8; commuter-test (3 of 6) 7; commuter-test (6 of 6) 5; commuter-test (4 of 6) 4

## Every job: waiting / setup / running (p50 / p95)

| Job | group | ran | failed | cancelled | skipped | waiting | setup | running | whole job |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| phone-test (3 of 3) | public-suite | 50 | 0 | 0 | 0 | 41 s / 7m46s | 63 s / 78 s | 8m16s / 9m28s | 9m15s / 10m35s |
| commuter-test (1 of 6) | public-suite | 50 | 0 | 0 | 0 | 44 s / 8m11s | 61 s / 73 s | 7m58s / 9m25s | 8m49s / 10m32s |
| commuter-test (2 of 6) | public-suite | 50 | 0 | 0 | 0 | 41 s / 4m53s | 62 s / 74 s | 7m40s / 9m08s | 8m45s / 10m15s |
| commuter-test (3 of 6) | public-suite | 50 | 0 | 0 | 0 | 82 s / 6m13s | 61 s / 75 s | 7m43s / 9m11s | 8m45s / 10m25s |
| commuter-test (4 of 6) | public-suite | 50 | 0 | 0 | 0 | 93 s / 5m17s | 63 s / 73 s | 7m26s / 9m27s | 8m37s / 10m32s |
| commuter-test (5 of 6) | public-suite | 50 | 0 | 0 | 0 | 1m50s / 5m02s | 60 s / 74 s | 6m59s / 8m57s | 7m56s / 10m02s |
| commuter-test (6 of 6) | public-suite | 50 | 0 | 0 | 0 | 2m10s / 6m25s | 63 s / 79 s | 6m55s / 8m24s | 7m53s / 9m31s |
| The drawing suites (1 of 2) | drawing | 50 | 0 | 0 | 0 | 2 s / 3m34s | 62 s / 72 s | 6m17s / 6m52s | 7m17s / 7m58s |
| contribute-test | contribute-suite | 50 | 0 | 0 | 0 | 2 s / 3m05s | 61 s / 75 s | 5m28s / 6m22s | 6m28s / 7m33s |
| phone-test (1 of 3) | public-suite | 50 | 0 | 0 | 0 | 13 s / 8m18s | 62 s / 74 s | 5m04s / 6m20s | 6m03s / 7m21s |
| The drawing suites (2 of 2) | drawing | 50 | 0 | 0 | 0 | 2 s / 5m29s | 60 s / 72 s | 4m08s / 4m44s | 5m11s / 5m53s |
| The short public suites | public-suite | 50 | 0 | 0 | 0 | 1m55s / 5m10s | 61 s / 75 s | 4m03s / 5m04s | 5m08s / 5m59s |
| phone-test (2 of 3) | public-suite | 50 | 0 | 0 | 0 | 38 s / 5m54s | 61 s / 73 s | 4m04s / 4m48s | 5m07s / 5m53s |
| Storybook plays | storybook | 50 | 0 | 0 | 0 | 2 s / 2m51s | 58 s / 73 s | 3m06s / 3m54s | 4m00s / 5m03s |
| save-test | studio-suite | 50 | 0 | 0 | 0 | 6 s / 5m00s | 60 s / 72 s | 2m50s / 3m36s | 3m50s / 4m48s |
| profile-test | contribute-suite | 50 | 1 | 0 | 0 | 2 s / 3m50s | 58 s / 74 s | 2m44s / 3m02s | 3m42s / 4m11s |
| save-edit-test | studio-suite | 50 | 0 | 0 | 0 | 2 s / 4m55s | 62 s / 72 s | 2m26s / 2m46s | 3m35s / 3m54s |
| save-drafts-test | studio-suite | 50 | 0 | 0 | 0 | 2 s / 4m44s | 60 s / 75 s | 2m31s / 2m37s | 3m32s / 3m52s |
| account-test, forgot-password-test, claim-test | contribute-suite | 50 | 0 | 0 | 0 | 2 s / 3m27s | 61 s / 73 s | 2m11s / 2m28s | 3m10s / 3m31s |
| Build and unit checks | build | 50 | 0 | 0 | 0 | 2 s / 3m53s | 51 s / 60 s | 2m17s / 2m54s | 3m07s / 3m54s |
| upload-test | contribute-suite | 50 | 0 | 0 | 0 | 2 s / 3m43s | 63 s / 81 s | 97 s / 1m53s | 2m42s / 3m06s |
| save-ikot-test | studio-suite | 50 | 0 | 0 | 0 | 2 s / 4m49s | 60 s / 69 s | 96 s / 1m49s | 2m40s / 2m58s |
| studio-scale-test, studio-contributors-test | studio-suite | 50 | 0 | 0 | 0 | 3 s / 5m16s | 62 s / 75 s | 63 s / 74 s | 2m11s / 2m28s |
| turnstile-test, studio-public-view-test, studio-two-editors-test | studio-suite | 50 | 0 | 0 | 0 | 34 s / 4m14s | 56 s / 72 s | 61 s / 71 s | 1m57s / 2m19s |
| pwa-test (own tiles) | preview-suite | 50 | 0 | 0 | 0 | 69 s / 4m55s | 61 s / 79 s | 34 s / 40 s | 95 s / 1m56s |
| pwa-test | preview-suite | 50 | 0 | 0 | 0 | 62 s / 4m21s | 60 s / 71 s | 34 s / 39 s | 95 s / 1m50s |
| contribute-offline-test | preview-suite | 50 | 1 | 0 | 0 | 85 s / 4m07s | 61 s / 77 s | 20 s / 28 s | 85 s / 1m40s |
| handover-test | preview-suite | 50 | 0 | 0 | 0 | 71 s / 5m11s | 62 s / 74 s | 9 s / 11 s | 71 s / 87 s |
| What changed | changes | 50 | 0 | 0 | 0 | 2 s / 2m00s | 4 s / 11 s | 3 s / 6 s | 8 s / 17 s |
| The editor | studio | 50 | 0 | 0 | 0 | 2 s / 2m20s | 1 s / 1 s | 2 s / 3 s | 3 s / 4 s |
| Build and the public map | public | 50 | 2 | 0 | 0 | 2 s / 1m47s | 1 s / 1 s | 2 s / 3 s | 3 s / 4 s |

## By group (every job of the group pooled)

| Group | jobs | waiting | setup | running | whole job |
| --- | --- | --- | --- | --- | --- |
| changes | 50 | 2 s / 2m00s | 4 s / 11 s | 3 s / 6 s | 8 s / 17 s |
| build | 50 | 2 s / 3m53s | 51 s / 60 s | 2m17s / 2m54s | 3m07s / 3m54s |
| drawing | 100 | 2 s / 3m59s | 61 s / 72 s | 4m48s / 6m47s | 5m50s / 7m53s |
| contribute-suite | 200 | 2 s / 3m27s | 61 s / 75 s | 2m29s / 6m17s | 3m26s / 7m21s |
| storybook | 50 | 2 s / 2m51s | 58 s / 73 s | 3m06s / 3m54s | 4m00s / 5m03s |
| studio-suite | 300 | 3 s / 4m49s | 60 s / 73 s | 1m49s / 3m18s | 2m50s / 4m23s |
| public-suite | 500 | 79 s / 5m54s | 62 s / 75 s | 6m55s / 9m02s | 7m54s / 10m15s |
| preview-suite | 200 | 72 s / 4m21s | 61 s / 77 s | 28 s / 38 s | 87 s / 1m51s |
| studio | 50 | 2 s / 2m20s | 1 s / 1 s | 2 s / 3 s | 3 s / 4 s |
| public | 50 | 2 s / 1m47s | 1 s / 1 s | 2 s / 3 s | 3 s / 4 s |
| ALL | 1550 | 4 s / 4m39s | 60 s / 74 s | 2m44s / 8m33s | |

Summed over every job that ran to a result: waiting 1956 min, setup 1413 min, running 5397 min.

## Steps (p95 of 2 s or more)

| group :: step | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| build :: Build, with the boundary and build checks | 50 | 6 s | 8 s | 8 s |
| build :: Code health | 50 | 33 s | 41 s | 43 s |
| build :: Formatting | 50 | 14 s | 19 s | 19 s |
| build :: Keep the OpenFreeMap preview build | 50 | 2 s | 3 s | 3 s |
| build :: Keep the own-tiles preview build | 50 | 2 s | 3 s | 5 s |
| build :: Lint | 50 | 34 s | 41 s | 42 s |
| build :: Run actions/checkout@<sha> | 48 | 1 s | 4 s | 6 s |
| build :: Run actions/setup-node@<sha> | 48 | 2 s | 8 s | 20 s |
| build :: Run actions/setup-node@v7 | 2 | 3 s | 4 s | 4 s |
| build :: Run npm ci | 50 | 42 s | 53 s | 57 s |
| build :: Set up job | 50 | 1 s | 2 s | 4 s |
| build :: The preview builds | 50 | 12 s | 15 s | 16 s |
| build :: The unit checks | 50 | 32 s | 42 s | 42 s |
| changes :: Glossary | 50 | 1 s | 4 s | 5 s |
| changes :: Run actions/checkout@<sha> | 48 | 3 s | 7 s | 9 s |
| changes :: Run actions/checkout@v7 | 2 | 2 s | 2 s | 2 s |
| changes :: Set up job | 50 | 1 s | 3 s | 3 s |
| contribute-suite :: account-test forgot-password-test claim-test | 50 | 2m07s | 2m26s | 2m28s |
| contribute-suite :: contribute-test | 50 | 5m26s | 6m18s | 6m26s |
| contribute-suite :: profile-test | 50 | 2m41s | 3m00s | 3m02s |
| contribute-suite :: Run ./.github/actions/prepare-browser-suite | 200 | 56 s | 69 s | 91 s |
| contribute-suite :: Run actions/checkout@<sha> | 192 | 2 s | 6 s | 7 s |
| contribute-suite :: Run actions/checkout@v7 | 8 | 2 s | 6 s | 6 s |
| contribute-suite :: Set up job | 200 | 1 s | 3 s | 4 s |
| contribute-suite :: Start the dev server | 200 | 1 s | 2 s | 2 s |
| contribute-suite :: upload-test | 50 | 94 s | 1m50s | 1m51s |
| drawing :: Run ./.github/actions/prepare-browser-suite | 100 | 56 s | 64 s | 74 s |
| drawing :: Run actions/checkout@<sha> | 96 | 2 s | 6 s | 7 s |
| drawing :: Run actions/checkout@v7 | 4 | 1 s | 3 s | 3 s |
| drawing :: Set up job | 100 | 1 s | 3 s | 5 s |
| drawing :: Start the dev server | 100 | 1 s | 2 s | 2 s |
| drawing :: The drawing suites | 100 | 4m45s | 6m44s | 7m12s |
| preview-suite :: contribute-offline-test | 50 | 18 s | 24 s | 28 s |
| preview-suite :: handover-test | 50 | 6 s | 8 s | 9 s |
| preview-suite :: pwa-test | 100 | 32 s | 36 s | 40 s |
| preview-suite :: Run ./.github/actions/prepare-browser-suite | 200 | 56 s | 67 s | 74 s |
| preview-suite :: Run actions/checkout@<sha> | 192 | 2 s | 6 s | 7 s |
| preview-suite :: Run actions/checkout@v7 | 8 | 4 s | 6 s | 6 s |
| preview-suite :: Set up job | 200 | 1 s | 3 s | 4 s |
| preview-suite :: The preview build | 200 | 1 s | 2 s | 3 s |
| public-suite :: commuter-test | 300 | 7m27s | 9m09s | 11m36s |
| public-suite :: gate-test scale-test map-pins-test back-test where-test loop-test | 50 | 4m01s | 5m02s | 5m21s |
| public-suite :: phone-test | 150 | 5m02s | 8m53s | 9m35s |
| public-suite :: Run ./.github/actions/prepare-browser-suite | 500 | 57 s | 68 s | 8m51s |
| public-suite :: Run actions/checkout@<sha> | 480 | 2 s | 5 s | 8 s |
| public-suite :: Run actions/checkout@v7 | 20 | 2 s | 5 s | 7 s |
| public-suite :: Set up job | 500 | 1 s | 3 s | 4 s |
| public-suite :: Start the dev server | 500 | 1 s | 2 s | 2 s |
| storybook :: Build Storybook | 50 | 10 s | 14 s | 14 s |
| storybook :: Every story renders and plays | 50 | 2m53s | 3m38s | 3m46s |
| storybook :: Run ./.github/actions/prepare-browser-suite | 50 | 55 s | 70 s | 6m10s |
| storybook :: Run actions/checkout@<sha> | 48 | 2 s | 5 s | 6 s |
| storybook :: Run actions/checkout@v7 | 2 | 1 s | 4 s | 4 s |
| storybook :: Set up job | 50 | 0 s | 3 s | 4 s |
| studio-suite :: Run ./.github/actions/prepare-browser-suite | 300 | 56 s | 66 s | 79 s |
| studio-suite :: Run actions/checkout@<sha> | 288 | 2 s | 5 s | 7 s |
| studio-suite :: Run actions/checkout@v7 | 12 | 2 s | 5 s | 5 s |
| studio-suite :: save-drafts-test | 50 | 2m28s | 2m34s | 2m48s |
| studio-suite :: save-edit-test | 50 | 2m23s | 2m43s | 2m45s |
| studio-suite :: save-ikot-test | 50 | 93 s | 1m47s | 2m01s |
| studio-suite :: save-test | 50 | 2m46s | 3m32s | 4m06s |
| studio-suite :: Set up job | 300 | 1 s | 3 s | 4 s |
| studio-suite :: Start the dev server | 300 | 1 s | 2 s | 2 s |
| studio-suite :: studio-scale-test studio-contributors-test | 50 | 60 s | 71 s | 74 s |
| studio-suite :: turnstile-test studio-public-view-test studio-two-editors-test | 50 | 58 s | 68 s | 69 s |

## Setup steps and first work step, per job

- **phone-test (3 of 3)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: phone-test
- **commuter-test (1 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (2 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (3 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (4 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (5 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (6 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **The drawing suites (1 of 2)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: The drawing suites
- **contribute-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: contribute-test
- **phone-test (1 of 3)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: phone-test
- **The drawing suites (2 of 2)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: The drawing suites
- **The short public suites**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: gate-test scale-test map-pins-test back-test where-test loop-test
- **phone-test (2 of 3)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: phone-test
- **Storybook plays**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Run actions/checkout@v7. First work step: Build Storybook
- **save-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: save-test
- **profile-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for upload-test, account-test, forgot-password-test, claim-test and profile-test; Start the dev server; Run actions/checkout@v7. First work step: profile-test
- **save-edit-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: save-edit-test
- **save-drafts-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: save-drafts-test
- **account-test, forgot-password-test, claim-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for upload-test, account-test, forgot-password-test, claim-test and profile-test; Start the dev server; Run actions/checkout@v7. First work step: account-test forgot-password-test claim-test
- **Build and unit checks**: setup = Set up job; Run actions/checkout@<sha>; Run actions/setup-node@<sha>; Run npm ci; Run actions/checkout@v7; Run actions/setup-node@v7. First work step: Formatting
- **upload-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for upload-test, account-test, forgot-password-test, claim-test and profile-test; Start the dev server; Run actions/checkout@v7. First work step: upload-test
- **save-ikot-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: save-ikot-test
- **studio-scale-test, studio-contributors-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for the Contributors map's suites; Start the dev server; Run actions/checkout@v7. First work step: studio-scale-test studio-contributors-test
- **turnstile-test, studio-public-view-test, studio-two-editors-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Give turnstile-test a Turnstile site key; Start the dev server; Run actions/checkout@v7. First work step: turnstile-test studio-public-view-test studio-two-editors-test
- **pwa-test (own tiles)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; The preview build; Run actions/checkout@v7. First work step: pwa-test
- **pwa-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; The preview build; Run actions/checkout@v7. First work step: pwa-test
- **contribute-offline-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; The preview build; Run actions/checkout@v7. First work step: contribute-offline-test
- **handover-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; The preview build; Run actions/checkout@v7. First work step: handover-test
- **What changed**: setup = Set up job; Run actions/checkout@<sha>; Run actions/checkout@v7. First work step: Run # The suites that run on a build (preview-suite): every one for the public map, the
- **The editor**: setup = Set up job. First work step: Run echo "changes, build, studio suites, drawing suites: $RESULTS"
- **Build and the public map**: setup = Set up job. First work step: Run echo "changes, build, public suites, contributor suites, preview suites: $RESULTS"

## Failures

Failed jobs by count: Build and the public map 2; profile-test 1; contribute-offline-test 1

## Billed minutes

Sum of each job rounded up to the minute: 7610 min over 50 runs (152.2 per run), 3118 per day, 93528 per 30 days at this rate. By runner: {"ubuntu-latest (GitHub Actions)":7610}.

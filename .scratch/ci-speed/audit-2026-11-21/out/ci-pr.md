# ci-pr: 150 runs, 2026-11-14T03:18:00Z to 2026-11-21T05:31:32Z (7.09 days, 21.1 runs/day)

Conclusions: {"success":119,"cancelled":10,"failure":21}. Runs with run_attempt > 1: 0. Jobs without created_at: 0 of 3895.

## Time to result (run created to the last required job finished)

| Set | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| Every run with a verdict | 140 | 12m28s | 35m34s | 55m03s |
| …of the current job layout only | 124 | 11m50s | 22m08s | 35m34s |
| Whole run (created to updated_at), verdict runs | 140 | 12m28s | 35m35s | 55m04s |
| Run created to first job created, all runs | 150 | 1 s | 22 s | 2m16s |
| scope: public+studio+contribute+build (jobs ran p50 29) | 57 | 15m48s | 41m31s | 55m03s |
| scope: public+studio+contribute+drawing+build (jobs ran p50 31) | 41 | 12m18s | 18m46s | 23m00s |
| scope: nothing (docs only) (jobs ran p50 3) | 19 | 44 s | 4m50s | 4m50s |
| scope: public+contribute+build (jobs ran p50 23) | 9 | 11m45s | 23m36s | 23m36s |
| scope: contribute+build (jobs ran p50 10) | 7 | 10m51s | 19m27s | 19m27s |
| scope: studio+drawing+build (jobs ran p50 13) | 5 | 8m15s | 17m44s | 17m44s |
| scope: studio+build (jobs ran p50 11) | 1 | 4m07s | 4m07s | 4m07s |
| scope: build (jobs ran p50 5) | 1 | 8m24s | 8m24s | 8m24s |

## The critical chain, bucket by bucket (verdict runs)

| Bucket | p50 | p95 | mean |
| --- | --- | --- | --- |
| beforeFirstJob | 1 s | 8 s | 4 s |
| waiting | 3m14s | 18m44s | 5m07s |
| setup | 65 s | 79 s | 56 s |
| running | 7m58s | 21m40s | 8m17s |
| handoffs | 1 s | 2 s | 1 s |

- scope public+studio+contribute+build (n=57): beforeFirstJob 1 s/68 s, waiting 5m10s/22m26s, setup 66 s/84 s, running 8m34s/24m13s, handoffs 1 s/2 s
- scope public+studio+contribute+drawing+build (n=41): beforeFirstJob 1 s/23 s, waiting 3m09s/8m03s, setup 70 s/80 s, running 8m00s/10m16s, handoffs 1 s/2 s
- scope nothing (docs only) (n=19): beforeFirstJob 1 s/1 s, waiting 32 s/4m36s, setup 5 s/12 s, running 6 s/12 s, handoffs 0 s/2 s
- scope public+contribute+build (n=9): beforeFirstJob 1 s/8 s, waiting 6 s/5m35s, setup 65 s/71 s, running 9m34s/22m53s, handoffs 1 s/2 s
- scope contribute+build (n=7): beforeFirstJob 1 s/1 s, waiting 4m55s/17m12s, setup 41 s/75 s, running 5m17s/6m31s, handoffs 0 s/1 s
- scope studio+drawing+build (n=5): beforeFirstJob 1 s/1 s, waiting 6 s/9m20s, setup 67 s/78 s, running 5m58s/7m16s, handoffs 0 s/0 s
- scope studio+build (n=1): beforeFirstJob 0 s/0 s, waiting 6 s/6 s, setup 29 s/29 s, running 3m31s/3m31s, handoffs 1 s/1 s
- scope build (n=1): beforeFirstJob 1 s/1 s, waiting 5m11s/5m11s, setup 27 s/27 s, running 2m45s/2m45s, handoffs 0 s/0 s

Job that set the result time (the last to finish before the summary job), by count: phone-test (3 of 3) 23; What changed 19; commuter-test (4 of 6) 16; commuter-test (1 of 6) 13; commuter-test (2 of 6) 12; commuter-test (3 of 6) 12; phone-test 8; commuter-test (5 of 6) 7; contribute-test 7; The drawing suites (1 of 2) 6; commuter-test (1 of 3) 6; phone-test (1 of 3) 3; commuter-test (6 of 6) 2; commuter-test (3 of 3) 2; phone-test (2 of 3) 1; upload-test 1; save-test 1; Build and unit checks 1

## Every job: waiting / setup / running (p50 / p95)

| Job | group | ran | failed | cancelled | skipped | waiting | setup | running | whole job |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| phone-test | public-suite | 17 | 0 | 0 | 0 | 4m49s / 21m46s | 28 s / 46 s | 21m35s / 24m29s | 22m19s / 24m57s |
| commuter-test (1 of 3) | public-suite | 15 | 0 | 1 | 0 | 6m10s / 27m18s | 25 s / 35 s | 18m02s / 25m43s | 18m27s / 26m14s |
| commuter-test (3 of 3) | public-suite | 16 | 0 | 0 | 0 | 7m00s / 29m22s | 24 s / 39 s | 16m40s / 24m13s | 17m05s / 24m41s |
| commuter-test (2 of 3) | public-suite | 16 | 0 | 0 | 0 | 7m35s / 30m06s | 23 s / 38 s | 14m38s / 17m39s | 15m06s / 18m00s |
| The drawing suites | drawing | 1 | 0 | 1 | 20 | 2 s / 2 s | 25 s / 25 s | 9m55s / 9m55s | 10m20s / 10m20s |
| phone-test (3 of 3) | public-suite | 91 | 7 | 7 | 0 | 2m04s / 11m15s | 61 s / 75 s | 8m01s / 8m43s | 8m44s / 10m09s |
| commuter-test (3 of 6) | public-suite | 92 | 0 | 7 | 0 | 1m53s / 8m07s | 58 s / 78 s | 6m58s / 8m54s | 7m56s / 9m57s |
| commuter-test (2 of 6) | public-suite | 92 | 0 | 7 | 0 | 99 s / 8m44s | 59 s / 71 s | 6m54s / 8m44s | 7m54s / 9m24s |
| commuter-test (1 of 6) | public-suite | 92 | 0 | 7 | 0 | 1m57s / 11m53s | 61 s / 77 s | 6m56s / 8m48s | 7m49s / 10m21s |
| commuter-test (4 of 6) | public-suite | 92 | 0 | 7 | 0 | 2m11s / 8m57s | 61 s / 74 s | 7m03s / 9m25s | 7m47s / 10m22s |
| commuter-test (5 of 6) | public-suite | 92 | 0 | 7 | 0 | 2m15s / 8m34s | 60 s / 75 s | 6m40s / 8m07s | 7m41s / 8m49s |
| commuter-test (6 of 6) | public-suite | 92 | 1 | 7 | 0 | 2m04s / 9m46s | 59 s / 78 s | 6m08s / 7m45s | 6m59s / 9m00s |
| contribute-test | contribute-suite | 115 | 0 | 7 | 0 | 7 s / 12m27s | 59 s / 77 s | 5m33s / 6m29s | 6m29s / 7m38s |
| phone-test (1 of 3) | public-suite | 91 | 1 | 7 | 0 | 99 s / 9m12s | 58 s / 75 s | 5m03s / 8m38s | 6m08s / 9m12s |
| The drawing suites (1 of 2) | drawing | 46 | 4 | 2 | 0 | 2 s / 5m49s | 58 s / 70 s | 4m46s / 6m45s | 5m50s / 7m57s |
| The drawing suites (2 of 2) | drawing | 46 | 0 | 2 | 0 | 2 s / 4m34s | 61 s / 71 s | 4m05s / 4m35s | 5m06s / 5m37s |
| phone-test (2 of 3) | public-suite | 91 | 0 | 7 | 0 | 71 s / 8m53s | 57 s / 73 s | 3m57s / 7m47s | 5m01s / 8m38s |
| The short public suites | public-suite | 93 | 0 | 6 | 0 | 1m40s / 8m55s | 59 s / 81 s | 3m29s / 4m37s | 4m32s / 5m24s |
| Storybook plays | storybook | 123 | 1 | 8 | 19 | 3 s / 9m09s | 53 s / 69 s | 2m58s / 3m55s | 3m51s / 5m00s |
| save-test | studio-suite | 106 | 0 | 6 | 0 | 43 s / 13m24s | 58 s / 74 s | 2m52s / 3m46s | 3m51s / 4m43s |
| profile-test | contribute-suite | 116 | 0 | 6 | 0 | 4 s / 14m46s | 58 s / 75 s | 2m43s / 3m01s | 3m39s / 4m11s |
| save-edit-test | studio-suite | 106 | 0 | 6 | 0 | 29 s / 16m53s | 58 s / 75 s | 2m23s / 2m48s | 3m23s / 3m55s |
| save-drafts-test | studio-suite | 106 | 0 | 6 | 0 | 1m43s / 18m27s | 55 s / 71 s | 2m17s / 2m51s | 3m13s / 3m46s |
| studio-scale-test | studio-suite | 14 | 0 | 0 | 0 | 8m14s / 29m08s | 24 s / 37 s | 2m32s / 3m24s | 2m59s / 3m52s |
| Build and unit checks | build | 124 | 7 | 7 | 19 | 3 s / 10m07s | 46 s / 57 s | 2m14s / 2m51s | 2m58s / 3m44s |
| account-test, forgot-password-test, claim-test | contribute-suite | 101 | 0 | 4 | 0 | 3 s / 7m50s | 57 s / 76 s | 1m52s / 2m30s | 2m47s / 3m42s |
| upload-test | contribute-suite | 117 | 0 | 5 | 0 | 38 s / 8m52s | 58 s / 71 s | 99 s / 1m54s | 2m35s / 3m02s |
| save-ikot-test | studio-suite | 107 | 0 | 5 | 0 | 77 s / 11m21s | 57 s / 70 s | 97 s / 2m02s | 2m33s / 2m58s |
| loop-test | public-suite | 16 | 0 | 0 | 0 | 3m45s / 29m24s | 27 s / 66 s | 1m57s / 2m17s | 2m31s / 2m47s |
| studio-scale-test, studio-contributors-test | studio-suite | 94 | 0 | 4 | 0 | 3 s / 8m08s | 58 s / 75 s | 62 s / 74 s | 2m02s / 2m22s |
| turnstile-test, studio-public-view-test, studio-two-editors-test | studio-suite | 94 | 0 | 4 | 0 | 7 s / 9m30s | 59 s / 77 s | 59 s / 71 s | 1m58s / 2m20s |
| where-test | public-suite | 16 | 0 | 0 | 0 | 6m11s / 31m44s | 25 s / 37 s | 79 s / 89 s | 1m45s / 1m58s |
| pwa-test (own tiles) | preview-suite | 103 | 0 | 1 | 0 | 60 s / 7m07s | 59 s / 74 s | 35 s / 40 s | 94 s / 1m54s |
| pwa-test | preview-suite | 102 | 0 | 2 | 0 | 65 s / 7m39s | 60 s / 74 s | 34 s / 38 s | 93 s / 1m49s |
| account-test | contribute-suite | 17 | 0 | 0 | 0 | 4m16s / 17m11s | 25 s / 38 s | 47 s / 66 s | 79 s / 97 s |
| claim-test | contribute-suite | 17 | 0 | 0 | 0 | 4m51s / 21m13s | 28 s / 55 s | 49 s / 56 s | 79 s / 1m51s |
| back-test | public-suite | 16 | 0 | 0 | 0 | 5m46s / 21m34s | 27 s / 46 s | 43 s / 50 s | 72 s / 90 s |
| contribute-offline-test | preview-suite | 109 | 1 | 1 | 0 | 60 s / 6m54s | 54 s / 72 s | 16 s / 23 s | 70 s / 91 s |
| studio-two-editors-test | studio-suite | 14 | 0 | 0 | 0 | 8m00s / 31m14s | 26 s / 38 s | 42 s / 53 s | 70 s / 81 s |
| handover-test | preview-suite | 103 | 1 | 1 | 0 | 57 s / 6m34s | 59 s / 71 s | 9 s / 12 s | 68 s / 82 s |
| map-pins-test | public-suite | 16 | 0 | 0 | 0 | 9m15s / 27m36s | 26 s / 48 s | 36 s / 46 s | 67 s / 88 s |
| studio-contributors-test | studio-suite | 14 | 0 | 0 | 0 | 6m41s / 31m17s | 25 s / 33 s | 31 s / 38 s | 56 s / 64 s |
| gate-test | public-suite | 16 | 0 | 0 | 0 | 7m43s / 30m33s | 28 s / 45 s | 19 s / 21 s | 47 s / 64 s |
| forgot-password-test | contribute-suite | 17 | 0 | 0 | 0 | 2m22s / 32m07s | 25 s / 73 s | 19 s / 23 s | 46 s / 96 s |
| scale-test | public-suite | 16 | 0 | 0 | 0 | 7m43s / 31m28s | 29 s / 52 s | 17 s / 19 s | 44 s / 69 s |
| turnstile-test | studio-suite | 14 | 0 | 0 | 0 | 5m24s / 30m44s | 26 s / 49 s | 18 s / 22 s | 44 s / 68 s |
| studio-public-view-test | studio-suite | 14 | 0 | 0 | 0 | 6m30s / 28m43s | 25 s / 45 s | 9 s / 11 s | 34 s / 56 s |
| What changed | changes | 148 | 0 | 2 | 0 | 2 s / 2m56s | 4 s / 10 s | 4 s / 7 s | 8 s / 17 s |
| The editor | studio | 150 | 19 | 0 | 0 | 2 s / 2m40s | 1 s / 2 s | 2 s / 4 s | 3 s / 5 s |
| Build and the public map | public | 150 | 28 | 0 | 0 | 2 s / 1m59s | 1 s / 1 s | 2 s / 4 s | 3 s / 5 s |

## By group (every job of the group pooled)

| Group | jobs | waiting | setup | running | whole job |
| --- | --- | --- | --- | --- | --- |
| changes | 148 | 2 s / 2m56s | 4 s / 10 s | 4 s / 7 s | 8 s / 17 s |
| build | 124 | 3 s / 10m07s | 46 s / 57 s | 2m14s / 2m51s | 2m58s / 3m44s |
| storybook | 123 | 3 s / 9m09s | 53 s / 69 s | 2m58s / 3m55s | 3m51s / 5m00s |
| contribute-suite | 500 | 19 s / 12m27s | 55 s / 75 s | 2m20s / 6m04s | 3m07s / 7m06s |
| studio-suite | 683 | 78 s / 17m39s | 56 s / 73 s | 1m49s / 3m20s | 2m36s / 4m18s |
| public-suite | 1078 | 2m10s / 16m30s | 57 s / 75 s | 6m25s / 13m09s | 7m22s / 13m29s |
| other | 0 | – / – | – / – | – / – | – / – |
| preview-suite | 417 | 60 s / 7m07s | 58 s / 73 s | 24 s / 38 s | 76 s / 1m48s |
| studio | 150 | 2 s / 2m40s | 1 s / 2 s | 2 s / 4 s | 3 s / 5 s |
| public | 150 | 2 s / 1m59s | 1 s / 1 s | 2 s / 4 s | 3 s / 5 s |
| drawing | 93 | 2 s / 5m18s | 60 s / 71 s | 4m16s / 6m45s | 5m13s / 7m47s |
| ALL | 3466 | 43 s / 12m37s | 53 s / 73 s | 2m17s / 8m08s | |

Summed over every job that ran to a result: waiting 9439 min, setup 2619 min, running 10782 min.

## Steps (p95 of 2 s or more)

| group :: step | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| build :: Build, with the boundary and build checks | 120 | 6 s | 8 s | 9 s |
| build :: Code health | 124 | 33 s | 41 s | 43 s |
| build :: Formatting | 124 | 14 s | 19 s | 20 s |
| build :: Keep the OpenFreeMap preview build | 110 | 2 s | 3 s | 3 s |
| build :: Keep the own-tiles preview build | 104 | 2 s | 3 s | 3 s |
| build :: Lint | 123 | 33 s | 42 s | 45 s |
| build :: Run actions/checkout@<sha> | 50 | 2 s | 5 s | 8 s |
| build :: Run actions/checkout@v7 | 74 | 2 s | 6 s | 7 s |
| build :: Run actions/setup-node@<sha> | 50 | 3 s | 7 s | 11 s |
| build :: Run actions/setup-node@v7 | 74 | 3 s | 9 s | 13 s |
| build :: Run npm ci | 124 | 38 s | 50 s | 54 s |
| build :: Set up job | 124 | 1 s | 3 s | 5 s |
| build :: The preview builds | 110 | 11 s | 15 s | 16 s |
| build :: The unit checks | 117 | 31 s | 40 s | 42 s |
| changes :: Areas touched | 148 | 0 s | 4 s | 5 s |
| changes :: Run actions/checkout@<sha> | 65 | 3 s | 7 s | 8 s |
| changes :: Run actions/checkout@v7 | 83 | 3 s | 6 s | 12 s |
| changes :: Set up job | 148 | 1 s | 3 s | 4 s |
| contribute-suite :: account-test | 17 | 44 s | 64 s | 64 s |
| contribute-suite :: account-test forgot-password-test claim-test | 101 | 1m50s | 2m27s | 2m36s |
| contribute-suite :: claim-test | 17 | 46 s | 53 s | 53 s |
| contribute-suite :: contribute-test | 115 | 5m30s | 6m25s | 7m03s |
| contribute-suite :: forgot-password-test | 17 | 17 s | 19 s | 19 s |
| contribute-suite :: profile-test | 116 | 2m41s | 2m58s | 3m02s |
| contribute-suite :: Run ./.github/actions/prepare-browser-suite | 500 | 51 s | 68 s | 2m07s |
| contribute-suite :: Run actions/checkout@<sha> | 199 | 2 s | 6 s | 26 s |
| contribute-suite :: Run actions/checkout@v7 | 301 | 2 s | 5 s | 7 s |
| contribute-suite :: Set up job | 500 | 1 s | 3 s | 4 s |
| contribute-suite :: Start the dev server | 500 | 1 s | 2 s | 2 s |
| contribute-suite :: upload-test | 117 | 96 s | 1m51s | 2m04s |
| drawing :: Keep the screenshots and the dev server log | 4 | 2 s | 2 s | 2 s |
| drawing :: Run ./.github/actions/prepare-browser-suite | 93 | 54 s | 65 s | 73 s |
| drawing :: Run actions/checkout@<sha> | 36 | 2 s | 5 s | 7 s |
| drawing :: Run actions/checkout@v7 | 57 | 2 s | 4 s | 6 s |
| drawing :: Set up job | 93 | 1 s | 2 s | 4 s |
| drawing :: Start the dev server | 93 | 1 s | 2 s | 2 s |
| drawing :: The drawing suites | 93 | 4m12s | 6m42s | 9m53s |
| preview-suite :: contribute-offline-test | 109 | 14 s | 20 s | 23 s |
| preview-suite :: handover-test | 103 | 6 s | 9 s | 26 s |
| preview-suite :: pwa-test | 205 | 32 s | 37 s | 1m52s |
| preview-suite :: Run ./.github/actions/prepare-browser-suite | 417 | 53 s | 66 s | 4m12s |
| preview-suite :: Run actions/checkout@<sha> | 190 | 2 s | 5 s | 8 s |
| preview-suite :: Run actions/checkout@v7 | 227 | 2 s | 5 s | 7 s |
| preview-suite :: Set up job | 417 | 1 s | 3 s | 5 s |
| preview-suite :: The preview build | 417 | 1 s | 2 s | 3 s |
| public :: Run echo "changes, build, public suites, contributor suites, preview suites: $RESULTS" | 150 | 0 s | 2 s | 3 s |
| public-suite :: back-test | 16 | 40 s | 48 s | 48 s |
| public-suite :: commuter-test | 599 | 6m52s | 14m35s | 25m40s |
| public-suite :: gate-test | 16 | 16 s | 18 s | 18 s |
| public-suite :: gate-test scale-test map-pins-test back-test where-test loop-test | 93 | 3m26s | 4m33s | 5m00s |
| public-suite :: Keep the screenshots and the dev server log | 9 | 1 s | 2 s | 2 s |
| public-suite :: loop-test | 16 | 1m55s | 2m14s | 2m14s |
| public-suite :: map-pins-test | 16 | 33 s | 45 s | 45 s |
| public-suite :: phone-test | 290 | 5m50s | 19m19s | 24m26s |
| public-suite :: Run ./.github/actions/prepare-browser-suite | 1078 | 52 s | 67 s | 5m09s |
| public-suite :: Run actions/checkout@<sha> | 461 | 2 s | 6 s | 31 s |
| public-suite :: Run actions/checkout@v7 | 617 | 2 s | 5 s | 8 s |
| public-suite :: scale-test | 16 | 14 s | 16 s | 16 s |
| public-suite :: Set up job | 1078 | 1 s | 3 s | 5 s |
| public-suite :: Start the dev server | 1078 | 1 s | 2 s | 2 s |
| public-suite :: where-test | 16 | 76 s | 86 s | 86 s |
| storybook :: Build Storybook | 123 | 10 s | 14 s | 17 s |
| storybook :: Every story renders and plays | 123 | 2m45s | 3m39s | 4m05s |
| storybook :: Run ./.github/actions/prepare-browser-suite | 123 | 50 s | 65 s | 74 s |
| storybook :: Run actions/checkout@<sha> | 50 | 2 s | 5 s | 5 s |
| storybook :: Run actions/checkout@v7 | 73 | 2 s | 5 s | 9 s |
| storybook :: Set up job | 123 | 1 s | 3 s | 5 s |
| studio :: Run echo "changes, build, studio suites, drawing suites: $RESULTS" | 150 | 0 s | 2 s | 2 s |
| studio-suite :: Run ./.github/actions/prepare-browser-suite | 683 | 51 s | 66 s | 2m41s |
| studio-suite :: Run actions/checkout@<sha> | 272 | 2 s | 6 s | 8 s |
| studio-suite :: Run actions/checkout@v7 | 411 | 2 s | 6 s | 9 s |
| studio-suite :: save-drafts-test | 106 | 2m13s | 2m48s | 3m03s |
| studio-suite :: save-edit-test | 106 | 2m20s | 2m45s | 3m27s |
| studio-suite :: save-ikot-test | 107 | 94 s | 1m59s | 2m09s |
| studio-suite :: save-test | 106 | 2m49s | 3m43s | 4m04s |
| studio-suite :: Set up job | 683 | 1 s | 3 s | 5 s |
| studio-suite :: Start the dev server | 683 | 1 s | 2 s | 2 s |
| studio-suite :: studio-contributors-test | 14 | 28 s | 36 s | 36 s |
| studio-suite :: studio-public-view-test | 14 | 7 s | 8 s | 8 s |
| studio-suite :: studio-scale-test | 14 | 2m30s | 3m20s | 3m20s |
| studio-suite :: studio-scale-test studio-contributors-test | 94 | 59 s | 71 s | 74 s |
| studio-suite :: studio-two-editors-test | 14 | 40 s | 50 s | 50 s |
| studio-suite :: turnstile-test | 14 | 15 s | 19 s | 19 s |
| studio-suite :: turnstile-test studio-public-view-test studio-two-editors-test | 94 | 56 s | 69 s | 71 s |

## Setup steps and first work step, per job

- **phone-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: phone-test
- **commuter-test (1 of 3)**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: commuter-test
- **commuter-test (3 of 3)**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: commuter-test
- **commuter-test (2 of 3)**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: commuter-test
- **The drawing suites**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: The drawing suites
- **phone-test (3 of 3)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: phone-test
- **commuter-test (3 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (2 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (1 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (4 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (5 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **commuter-test (6 of 6)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: commuter-test
- **contribute-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: contribute-test
- **phone-test (1 of 3)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: phone-test
- **The drawing suites (1 of 2)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: The drawing suites
- **The drawing suites (2 of 2)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: The drawing suites
- **phone-test (2 of 3)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: phone-test
- **The short public suites**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: gate-test scale-test map-pins-test back-test where-test loop-test
- **Storybook plays**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Run actions/checkout@v7. First work step: Build Storybook
- **save-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: save-test
- **profile-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for upload-test, account-test, forgot-password-test, claim-test and profile-test; Start the dev server; Run actions/checkout@v7. First work step: profile-test
- **save-edit-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: save-edit-test
- **save-drafts-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: save-drafts-test
- **studio-scale-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for the Contributors map's suites; Start the dev server. First work step: studio-scale-test
- **Build and unit checks**: setup = Set up job; Run actions/checkout@<sha>; Run actions/setup-node@<sha>; Run npm ci; Run actions/checkout@v7; Run actions/setup-node@v7. First work step: Formatting
- **account-test, forgot-password-test, claim-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for upload-test, account-test, forgot-password-test, claim-test and profile-test; Start the dev server; Run actions/checkout@v7. First work step: account-test forgot-password-test claim-test
- **upload-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for upload-test, account-test, forgot-password-test, claim-test and profile-test; Start the dev server; Run actions/checkout@v7. First work step: upload-test
- **save-ikot-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server; Run actions/checkout@v7. First work step: save-ikot-test
- **loop-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: loop-test
- **studio-scale-test, studio-contributors-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for the Contributors map's suites; Start the dev server; Run actions/checkout@v7. First work step: studio-scale-test studio-contributors-test
- **turnstile-test, studio-public-view-test, studio-two-editors-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Give turnstile-test a Turnstile site key; Start the dev server; Run actions/checkout@v7. First work step: turnstile-test studio-public-view-test studio-two-editors-test
- **where-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: where-test
- **pwa-test (own tiles)**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; The preview build; Run actions/checkout@v7. First work step: pwa-test
- **pwa-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; The preview build; Run actions/checkout@v7. First work step: pwa-test
- **account-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for upload-test, account-test, forgot-password-test, claim-test and profile-test; Start the dev server. First work step: account-test
- **claim-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for upload-test, account-test, forgot-password-test, claim-test and profile-test; Start the dev server. First work step: claim-test
- **back-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: back-test
- **contribute-offline-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; The preview build; Run actions/checkout@v7. First work step: contribute-offline-test
- **studio-two-editors-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: studio-two-editors-test
- **handover-test**: setup = Set up job; Run actions/checkout@<sha>; Run ./.github/actions/prepare-browser-suite; The preview build; Run actions/checkout@v7. First work step: handover-test
- **map-pins-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: map-pins-test
- **studio-contributors-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for the Contributors map's suites; Start the dev server. First work step: studio-contributors-test
- **gate-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: gate-test
- **forgot-password-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Turn uploads on, for upload-test, account-test, forgot-password-test, claim-test and profile-test; Start the dev server. First work step: forgot-password-test
- **scale-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: scale-test
- **turnstile-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Give turnstile-test a Turnstile site key; Start the dev server. First work step: turnstile-test
- **studio-public-view-test**: setup = Set up job; Run actions/checkout@v7; Run ./.github/actions/prepare-browser-suite; Give the dev server the public database address and key; Start the dev server. First work step: studio-public-view-test
- **What changed**: setup = Set up job; Run actions/checkout@<sha>; Run actions/checkout@v7. First work step: Run # The suites that run on a build (preview-suite): every one for the public map, the
- **The editor**: setup = Set up job. First work step: Run echo "changes, build, studio suites, drawing suites: $RESULTS"
- **Build and the public map**: setup = Set up job. First work step: Run echo "changes, build, public suites, contributor suites, preview suites: $RESULTS"

## Failures

Failed jobs by count: Build and the public map 28; The editor 19; phone-test (3 of 3) 7; Build and unit checks 7; The drawing suites (1 of 2) 4; phone-test (1 of 3) 1; contribute-offline-test 1; handover-test 1; commuter-test (6 of 6) 1; Storybook plays 1

## Billed minutes

Sum of each job rounded up to the minute: 15728 min over 150 runs (104.9 per run), 2217 per day, 66524 per 30 days at this rate. By runner: {"ubuntu-latest (GitHub Actions)":15490,"ubuntu-latest ()":238}.

# CI speed, phase 2: the audit and the plan

Written 2026-11-21 from `staging` at `0f610666`, from the last 150 pull-request runs of `ci.yml` (2026-11-14 to 2026-11-21).

Plan only. Nothing in `.github/`, `package.json` or the workflows was changed, and nothing here starts until the owner says so. Phase 1 is in `phase-1-summary.md`.

Where the numbers come from: `audit-2026-11-21/` beside this file holds the scripts that pulled and split the runs (`fetch.mjs`, `fetch-window.mjs`, `analyze.mjs`) and the tables they wrote (`out/`, start with `out/ci-pr-150.md`). A path below written `out\…` is in that folder. The raw API answers and job logs (large) were left on the machine that ran the audit and are not in the repo; `fetch.mjs` pulls them again.

Labels: **[measured]** is from the API data or timed that day; **[read]** was read that day in a repo file, a job log or a tool's own docs; **[inference]** is reasoning, not proof. Every statement about Bun, oxlint, Blacksmith and hk is **[read]** from their docs: none of them was installed or run.

## 1. The short version

- A pull request gets its result in **11 min 50 s at the median and 22 min 08 s at p95** (124 runs of today's job layout). The target is 1 min and 2 min. **[measured]**
- Only docs-only pull requests are under a minute: 10 of 140 runs with a verdict finished within 60 s. **[measured]**
- On the chain of jobs that sets the result time, the median run spends **7 min 37 s running tests, 3 min 09 s waiting for a runner and 67 s on setup**. At p95 waiting is the biggest: 12 min 26 s, against 9 min 53 s running. **[measured]**
- Waiting comes from GitHub's limit of 20 jobs at once on the Free plan. A full run starts 29 jobs. **[read: GitHub's limits page; measured: jobs per run]**
- The repository is **public**, so its 180,000 job-minutes a month cost **$0** today. Moving every job to Blacksmith would cost roughly **$700 to $1,450 a month** at today's volume. **[measured volume; read prices; inference on the total]**
- The brief's 1-minute median cannot be reached by speed alone. 70% of pull requests run the whole browser suite, which is 97 job-minutes of work. It is reachable only if the browser suites leave the pull request's required result and run in a merge queue instead. That is the owner's decision (section 6).
- Free fixes exist and come first: ESLint runs twice in the build job, `npm ci` became four times slower on 16 November for no reason I could find, and phone-test's three parts are unbalanced (3 min 57 s to 8 min 01 s).
- `bun lint`, `bun fmt` and `bun check` exist (Bun 1.4.5). `bun lint` can run this repo's `eslint.config.js` as it is, but then ESLint stays installed. oxlint has no equivalent for ten of the 174 rules, six of them rules the standards name, the import boundaries among them (section 5.5).

## 2. What runs on a pull request

**[read]** from `.github/workflows/` and `.github/actions/`.

| Workflow | When on a pull request | Jobs | Required? |
| --- | --- | --- | --- |
| `ci.yml` (CI) | every pull request | What changed; Build and unit checks; Storybook plays; 10 public jobs; 4 contributor jobs; up to 4 built-app jobs; 6 studio jobs; 2 drawing jobs; 2 summary jobs | **What changed**, **Build and the public map**, **The editor** |
| `security.yml` | every pull request | No secrets in the history; No known holes in production dependencies | no |
| `codeql.yml` | pull requests into `main` or `staging` | CodeQL ×2 | no |
| `contributor-app.yml` | paths: the app, `src/shared/**`, `src/design-system/**`, `src/features/routes/**`, `package.json`, the lockfile and more | apk; emulator-ride; emulator-notification | no |
| `database.yml` | paths under `supabase/`, the studio's data and more | Migrations on a throwaway Postgres; Review suites | no |
| `tiles.yml`, `landmarks.yml`, `watch.yml` | their own scripts only | one job each | no |

The required checks are set by ruleset 26126587 on `main` only. **`staging` has no ruleset**: `gh api repos/ParaOrg/Para/rulesets` lists three (the `app-v*` tags and two for `main`). `docs/agents/staging-protection.md` says the same: "**Not on yet.** Turning it on is the owner's step". So GitHub does not stop a red pull request from merging into `staging` today. **[measured]**

**Storybook plays is in neither summary job's `needs`.** A red Storybook job turns the run red but blocks no merge, even on `main`. **[read: ci.yml lines 656 to 688]**

### The `needs` edges

```
What changed ──┬─ Build and unit checks ──── pwa-test, pwa-test (own tiles), handover-test, contribute-offline-test
               ├─ Storybook plays
               ├─ 10 public jobs
               ├─ 4 contributor jobs
               ├─ 6 studio jobs
               └─ 2 drawing jobs
Build and the public map  needs: changes, build, public-suite, contribute-suite, preview-suite
The editor                needs: changes, build, studio-suite, drawing
```

Two required jobs wait on others by design: the summary jobs wait on everything. One more job waits: the built-app suites wait on the build job for its artifact.

## 3. The audit

### 3.1 The data

- **Filter:** `GET /repos/ParaOrg/Para/actions/workflows/ci.yml/runs?event=pull_request&status=completed`, newest first, the first 150. Then `GET /actions/runs/{id}/attempts/{n}/jobs?per_page=100` for every attempt of each.
- **Window:** 2026-11-14 03:18 UTC to 2026-11-21 05:31 UTC, 7.09 days, 21.1 runs a day.
- **Conclusions:** 119 success, 21 failure, 10 cancelled (a newer push took their place).
- **`created_at`:** present on all 3,895 job records. Nothing was substituted.
- **Two job layouts are in the window.** 17 of the 150 runs used the layout from before 16 November (phone-test in one job, commuter-test in three). Per-job numbers are by job name, so they do not mix. Per-run numbers are for today's layout unless said otherwise.
- **Comparison set:** the last 50 pushes to `staging` (17 to 20 November).
- **Other pull-request workflows:** the last 150 runs each of Security, CodeQL and Contributor app, and 100 of Database.

### 3.2 Definitions

- **Waiting** = job `started_at` minus job `created_at`. For a job with `needs`, `created_at` is when its needs finished, so this is time waiting for a runner, not for other jobs.
- **Setup** = job start to the start of the first step that does the job's work.
- **Running** = the rest, to the job's `completed_at`. It includes the "Post" steps (1 to 3 s).
- **Percentiles** are nearest-rank. Job statistics use jobs that ended in success or failure. Cancelled and skipped jobs are counted apart.

Steps classed as setup:

| Job | Setup steps | First work step |
| --- | --- | --- |
| What changed | Set up job; checkout | the scope script |
| Build and unit checks | Set up job; checkout; setup-node; `npm ci` | Formatting |
| Storybook plays | Set up job; checkout; prepare-browser-suite | Build Storybook |
| every browser suite on the dev server | Set up job; checkout; prepare-browser-suite; the `.env.local` steps; Start the dev server | the suite |
| the four built-app suites | Set up job; checkout; prepare-browser-suite; the artifact download | the suite |
| the two summary jobs | Set up job | the result check |

`prepare-browser-suite` is one step in the API. Inside it are setup-node, `npm ci`, two cache restores and the system packages.

### 3.3 Time to result

Run created to the last of the three required jobs finished. 140 of the 150 runs reached a verdict.

| Set | n | p50 | p95 | max |
| --- | --- | --- | --- | --- |
| All 140 runs with a verdict | 140 | 12m28s | 35m34s | 55m03s |
| **Today's layout** | 124 | **11m50s** | **22m08s** | 35m34s |
| Today's layout, waiting taken out (arithmetic, not a run) | 124 | 8m50s | 11m08s | |
| Pushes to `staging` (always the full suite) | 50 | 13m10s | 18m43s | 25m25s |

By what the pull request selected (all 140):

| Scope | n | Share | p50 | p95 | Job-minutes, p50 |
| --- | --- | --- | --- | --- | --- |
| Full suite, no drawing | 57 | 41% | 15m48s | 41m31s | 133 |
| Full suite with drawing | 41 | 29% | 12m18s | 18m46s | 143 |
| Docs only (nothing but the summary jobs) | 19 | 14% | 44 s | 4m50s | 3 |
| Public and contributor | 9 | 6% | 11m45s | 23m36s | 109 |
| Contributor only | 7 | 5% | 10m51s | 19m27s | 27 |
| Studio with drawing | 5 | 4% | 8m15s | 17m44s | 45 |
| Studio only; build only | 1 each | | 4m07s; 8m24s | | |

The first row is slower than the second because it holds most of the 17 old-layout runs. Within 60 s: 10 of 140. Within 120 s: 11 of 140.

### 3.4 The critical chain

For each run: the required job that finished last, then back through whichever needed job finished last. Today's layout, 124 runs.

| Bucket | p50 | p95 | mean |
| --- | --- | --- | --- |
| Run created to first job created | 1 s | 8 s | 3 s |
| **Waiting** for a runner, summed along the chain | **3m09s** | **12m26s** | 4m20s |
| **Setup**, summed along the chain | 67 s | 80 s | 59 s |
| **Running**, summed along the chain | **7m37s** | **9m53s** | 6m36s |
| Hand-offs between jobs | 1 s | 2 s | 1 s |

**The biggest bucket is running at the median (64% of 11m50s) and waiting at p95.**

The chain is always: What changed → one browser job → a summary job. The job that set the result time, in 74 successful full runs of today's layout:

| Job | Times it was the slowest |
| --- | --- |
| phone-test (3 of 3) | 24 |
| commuter-test (3 of 6) | 17 |
| commuter-test (1 of 6) | 9 |
| commuter-test (2 of 6), (4 of 6) | 8 each |
| the other commuter and phone parts | 8 |

The slowest job's running time per run: p50 **8m26s**, p95 10m40s. The build job never sets the result time for a full run.

### 3.5 Every job

150 pull-request runs. p50 / p95. Old-layout jobs are left out here (they are in `out\ci-pr-150.md`).

| Job | Ran | Failed | Waiting | Setup | Running | Whole job |
| --- | --- | --- | --- | --- | --- | --- |
| What changed | 148 | 0 | 2 s / 2m56s | 4 s / 10 s | 4 s / 7 s | 8 s / 17 s |
| Build and unit checks | 124 | 7 | 3 s / 10m07s | 46 s / 57 s | 2m14s / 2m51s | 2m58s / 3m44s |
| Storybook plays | 123 | 1 | 3 s / 9m09s | 53 s / 69 s | 2m58s / 3m55s | 3m51s / 5m00s |
| phone-test (1 of 3) | 91 | 1 | 99 s / 9m12s | 58 s / 75 s | 5m03s / 8m38s | 6m08s / 9m12s |
| phone-test (2 of 3) | 91 | 0 | 71 s / 8m53s | 57 s / 73 s | 3m57s / 7m47s | 5m01s / 8m38s |
| phone-test (3 of 3) | 91 | 7 | 2m04s / 11m15s | 61 s / 75 s | **8m01s / 8m43s** | 8m44s / 10m09s |
| commuter-test (1 of 6) | 92 | 0 | 1m57s / 11m53s | 61 s / 77 s | 6m56s / 8m48s | 7m49s / 10m21s |
| commuter-test (2 of 6) | 92 | 0 | 99 s / 8m44s | 59 s / 71 s | 6m54s / 8m44s | 7m54s / 9m24s |
| commuter-test (3 of 6) | 92 | 0 | 1m53s / 8m07s | 58 s / 78 s | 6m58s / 8m54s | 7m56s / 9m57s |
| commuter-test (4 of 6) | 92 | 0 | 2m11s / 8m57s | 61 s / 74 s | 7m03s / 9m25s | 7m47s / 10m22s |
| commuter-test (5 of 6) | 92 | 0 | 2m15s / 8m34s | 60 s / 75 s | 6m40s / 8m07s | 7m41s / 8m49s |
| commuter-test (6 of 6) | 92 | 1 | 2m04s / 9m46s | 59 s / 78 s | 6m08s / 7m45s | 6m59s / 9m00s |
| The short public suites | 93 | 0 | 1m40s / 8m55s | 59 s / 81 s | 3m29s / 4m37s | 4m32s / 5m24s |
| contribute-test | 115 | 0 | 7 s / 12m27s | 59 s / 77 s | 5m33s / 6m29s | 6m29s / 7m38s |
| profile-test | 116 | 0 | 4 s / 14m46s | 58 s / 75 s | 2m43s / 3m01s | 3m39s / 4m11s |
| upload-test | 117 | 0 | 38 s / 8m52s | 58 s / 71 s | 99 s / 1m54s | 2m35s / 3m02s |
| account, forgot-password, claim | 101 | 0 | 3 s / 7m50s | 57 s / 76 s | 1m52s / 2m30s | 2m47s / 3m42s |
| save-test | 106 | 0 | 43 s / 13m24s | 58 s / 74 s | 2m52s / 3m46s | 3m51s / 4m43s |
| save-edit-test | 106 | 0 | 29 s / 16m53s | 58 s / 75 s | 2m23s / 2m48s | 3m23s / 3m55s |
| save-drafts-test | 106 | 0 | 1m43s / 18m27s | 55 s / 71 s | 2m17s / 2m51s | 3m13s / 3m46s |
| save-ikot-test | 107 | 0 | 77 s / 11m21s | 57 s / 70 s | 97 s / 2m02s | 2m33s / 2m58s |
| studio-scale, studio-contributors | 94 | 0 | 3 s / 8m08s | 58 s / 75 s | 62 s / 74 s | 2m02s / 2m22s |
| turnstile, studio-public-view, studio-two-editors | 94 | 0 | 7 s / 9m30s | 59 s / 77 s | 59 s / 71 s | 1m58s / 2m20s |
| The drawing suites (1 of 2) | 46 | 4 | 2 s / 5m49s | 58 s / 70 s | 4m46s / 6m45s | 5m50s / 7m57s |
| The drawing suites (2 of 2) | 46 | 0 | 2 s / 4m34s | 61 s / 71 s | 4m05s / 4m35s | 5m06s / 5m37s |
| pwa-test | 102 | 0 | 65 s / 7m39s | 60 s / 74 s | 34 s / 38 s | 93 s / 1m49s |
| pwa-test (own tiles) | 103 | 0 | 60 s / 7m07s | 59 s / 74 s | 35 s / 40 s | 94 s / 1m54s |
| contribute-offline-test | 109 | 1 | 60 s / 6m54s | 54 s / 72 s | 16 s / 23 s | 70 s / 91 s |
| handover-test | 103 | 1 | 57 s / 6m34s | 59 s / 71 s | 9 s / 12 s | 68 s / 82 s |
| Build and the public map | 150 | 28 | 2 s / 1m59s | 1 s / 1 s | 2 s / 4 s | 3 s / 5 s |
| The editor | 150 | 19 | 2 s / 2m40s | 1 s / 2 s | 2 s / 4 s | 3 s / 5 s |
| **Every job pooled** | 3,466 | | **43 s / 12m37s** | **53 s / 73 s** | **2m17s / 8m08s** | |

Summed over those 3,466 jobs: waiting 9,439 minutes (41%), setup 2,619 (11%), running 10,782 (47%).

One successful full run of today's layout (74 runs): 29 jobs, 96.9 job-minutes running, 26.9 job-minutes of setup, 26.7 job-minutes waiting at p50 and 193 at p95.

How often each job runs at all: the build job and Storybook were skipped in 19 of 150 runs (docs only). The drawing suites were skipped in 99 of 150. The built-app suites were skipped in 33. The summary jobs' failure counts include runs where something under them was cancelled.

### 3.6 The steps inside the build job

124 runs. This is where the brief's lint, format, typecheck and test budgets land.

| Step | p50 | p95 | Brief's budget |
| --- | --- | --- | --- |
| `npm ci` | 38 s | 50 s | setup under 15 s in all |
| Formatting (`prettier --check .`) | 14 s | 19 s | under 1 s |
| Lint (`eslint .`) | 33 s | 42 s | under 1 s |
| Long files; Architecture page | under 1 s | | |
| Build (`tsc` three times, `vite build`, the build guards) | 6 s | 8 s | typecheck under 5 s |
| The unit checks (240 files, 1,924 tests) | 31 s | 40 s | under 30 s a shard |
| **Code health** | **33 s** | 41 s | |
| The preview builds (two more builds) | 11 s | 15 s | |

**Code health runs ESLint a second time.** `scripts/checks/health.mjs` line 87 spawns `eslint . -f json`. The step measures and never fails, and it sits before the preview builds, so the four built-app suites start 33 s later than they need to. **[read and measured]**

### 3.7 `npm ci` got four times slower on 16 November

| Day | Build job `npm ci`, p50 | Browser setup action, p50 |
| --- | --- | --- |
| 12 to 15 November | 7 to 10 s | 20 to 22 s |
| 16 November | 13 s (mixed) | 35 s |
| 17 to 21 November | 40 to 49 s | 54 to 57 s |

The change is between 16:44 and 17:31 UTC on 16 November. Before and after it the logs show the same cache key, the same 117 MB restored, the same 694 packages, the same Node 22.23.4 and npm 10.9.9, and the same runner image (20261111.196.1). Slow runs are in nine Azure regions, so it is not one region. `npm audit` in the Security workflow stayed at 1 s, so the registry's audit endpoint is not it. **[measured from 39 build logs, `out\npm-ci-sample.json`]**

**I could not find the cause.** It costs about 30 s of setup in each of 29 jobs, about 14 job-minutes a run. A local copy of the lockfile installed warm in 14 to 33 s on this Windows machine, which settles nothing.

### 3.8 Caches

What is cached today **[read]**:

| Cache | Key | Path |
| --- | --- | --- |
| npm's download cache (setup-node `cache: npm`) | hash of `package-lock.json` | `~/.npm` |
| Playwright's Chromium | OS, image name, Playwright version | `~/.cache/ms-playwright` |
| Chromium's system packages (.deb files) | OS, **exact image version**, Playwright version | `~/apt-debs` |
| Gradle, the Android emulator | by setup-gradle; emulator and image versions | Android jobs only |

`node_modules` itself is not cached. A pull request restores from its own ref, then `staging`, then `main`.

Hit rate on pull requests **[measured from logs]**:

- 39 of 39 sampled build jobs hit the npm cache.
- 23 of 23 evenly sampled browser jobs hit all three caches.
- Of the 6 slowest setup steps in the window, 3 missed the system-packages cache on 19 November, the day a new runner image arrived (2m35s to 5m09s each). Two image versions were live at once.

So the brief's "above 95%" is already met. The cost is in what a hit still leaves to do: `npm ci` unpacks 694 packages every time.

The cache store holds **9.66 GB of its 10 GB limit** in 412 entries: the Android emulator 3.6 GB, one pull request's Planetiler cache 1.4 GB, 374 Gradle entries 1.05 GB, Chromium about 1.8 GB over six branches. **[measured]** Anything added will push something else out.

### 3.9 Reruns, reds and anything that hides a failure

- **Reruns:** 0 of 150 runs had `run_attempt` above 1. **[measured]**
- **Reds:** 21 runs failed. By job, leaving out the summary jobs:

| Job | Failures | On which branches |
| --- | --- | --- |
| phone-test (3 of 3) | 7 | the phone-test work itself (4), route-card and sheet redesigns (3) |
| Build and unit checks | 7 | Dependabot bumps (5), two feature branches |
| The drawing suites (1 of 2) | 4 | the e2e stand-in work |
| phone-test (1 of 3), commuter-test (6 of 6), handover-test, contribute-offline-test, Storybook plays | 1 each | |

  I did not read the failing logs, so I cannot say which were flakes. Nobody re-ran a failed run; a new push was the only "retry".

- **A retry that hides failures:** the drawing suites run a failed suite once more after 60 s on pushes, the nightly run and "Run workflow" (`ci.yml` lines 621 to 639). On pull requests the router is a recording and there is no retry. In the last 50 pushes to `staging`, 1 of 100 drawing jobs used it (hotspot-test, 20 November) and passed the second time. **[measured from annotations, `out\router-retries.json`]**
- **`continue-on-error`:** two. `security.yml` "Known holes in the dev tools (report only)" and one step of `landmarks.yml`. Neither is on a pull request's required path.
- **Download retries in setup:** `curl --retry 3` for gitleaks; the emulator installer retries. These retry downloads, not tests.
- **Wide timeouts:** jobs that take 2 to 9 minutes have limits of 30 or 40. `ci.yml` says why for the studio jobs: "A slow runner has taken the save flows, run as one suite, past 25 min while still passing". The brief counts wider timeouts as hiding a failure.
- **Skipped tests:** none. No `.skip`, `.only` or `.todo` in `tests/`, `scripts/` or `src/`. The browser suites have their own `skip()`, and a skip not on a suite's `knownSkips` list fails it. **[read]**
- **Shrink-only baselines:** `storybook-play-baseline.json` and `long-files-baseline.json` (129 files) list known failures that may only shrink. Honest lists, but checks not yet enforced.
- **Fixed waits:** 411 `waitForTimeout` calls in `tests/e2e/`, 210 s if each ran once. Many are in loops, so the real total is higher. This is running time that checks nothing.

### 3.10 Minutes and cost

- `gh repo view` says **PUBLIC**. GitHub's page: standard runners on public repositories are "free and unlimited", with 4 vCPU and 16 GB. **[measured; read]**
- The 150 pull-request runs: **15,728 job-minutes**, each job rounded up to the minute, all on `ubuntu-latest`. 104.9 a run.
- Every workflow, seven whole days (14 to 20 November), 1,239 runs, jobs sampled per workflow and event (`out\window.json`):

| Workflow and event | Runs | Job-minutes a run | Job-minutes in 7 days |
| --- | --- | --- | --- |
| CI, pull request | 160 | 113 | 18,150 |
| CI, push | 101 | 154 | 15,598 |
| Contributor app, pull request | 78 | 38 | 2,955 |
| Contributor app, push | 45 | 40 | 1,816 |
| CI, nightly and by hand | 10 | 161 | 1,614 |
| CodeQL, Security, Staging red, Database, the rest | | | 2,025 |
| **Total** | **1,239** | | **42,158** |

That is **about 180,700 job-minutes per 30 days at this week's rate, for $0.** The week was busy and grew day by day, so a month may differ.

### 3.11 The other pull-request workflows

| Job | Runs | Waiting p50 / p95 | Whole job p50 / p95 |
| --- | --- | --- | --- |
| Contributor app: **emulator-ride** | 126 | 28 s / 3m56s | **25m00s / 26m13s** |
| Contributor app: emulator-notification | 134 | 18 s / 4m44s | 11m14s / 12m03s |
| Contributor app: apk | 145 | 14 s / 4m11s | 90 s / 2m14s |
| Database: Migrations on a throwaway Postgres | 100 | 16 s / 4m19s | 5m07s / 5m47s |
| Database: Review suites | 100 | 16 s / 4m33s | 6m06s / 8m35s |
| CodeQL (javascript-typescript) | 148 | 2 s / 2m26s | 81 s / 96 s |
| Security, both jobs | 149 | 2 s / 3m37s | 9 s / 18 s |

**The slowest check a pull request shows is emulator-ride, at 25 minutes.** It is not required. It is 20 minutes by design: "twenty minutes with the screen off, the app's process killed at fifteen" (`contributor-app.yml`). It ran on 78 pull requests in the week and holds one of the 20 runner slots for 25 minutes each time. (Since 2026-11-26 it runs on pushes to `staging` only.) 24 of the 150 Contributor app runs were cancelled and 3 were re-run.

### 3.12 Local

One run each on this machine (Windows 11, Node 24.14.1; CI uses Node 22). Logs in `local\`.

| Command | Wall clock | Exit | What happened |
| --- | --- | --- | --- |
| `npm run lint` | 106 s | **1** | 1,893 errors, **all** in three other sessions' worktrees under `.claude/worktrees/` (611 files each) |
| the same, worktrees ignored (`--ignore-pattern`) | 30.4 s | 0 | the main tree is clean |
| `npm run format:check` | 37.8 s | **1** | 96 files, all in the same three worktrees |
| the same, worktrees left out | 13.6 s | 0 | the main tree is clean |
| `npm run typecheck` | 2.3 s (3.5 s the first time) | 0 | |
| `npm run test:unit` | 18.4 s | **1** | 4 of 1,924 tests fail from PowerShell; 31 fail from Git Bash |

The unit failures, as reported:

- `contribute-css-sources-test.mjs` (2 tests, both shells): the test compares paths with `/` and gets `\` ("add to contribute.css: src\features\contribute\map\map-frost.tsx, …").
- `ci-summary-jobs-test.mjs` (2 tests, PowerShell only): it runs `bash` through `spawnSync`.
- `switch-pick-test.mjs` and `timeline-route-detail-test.mjs` (29 tests, Git Bash only): "Cannot read properties of null (reading 'useState')". The stack shows `c:/Users/…` for the source and `C:\Users\…` for React, so React loads twice. **[inference on the cause; same shape as the Storybook drive-letter note in memory]**

All three look Windows-only; CI on Linux passes them. They matter for hooks: **a pre-push hook that runs CI's checks would be red on this machine on every push, today.**

## 4. What surprised me

1. `staging` has no ruleset, so the three "required" checks are required on `main` only.
2. Storybook plays can fail without failing either required check.
3. ESLint runs twice in every build job.
4. `npm ci` went from 8 s to 40 s on 16 November with nothing changed that I can see.
5. Cache hits are already near 100%. Setup is slow anyway.
6. The cache store is at 9.66 of 10 GB.
7. The slowest pull-request check is not in CI at all: the 25-minute emulator ride.
8. `npm run lint`, `format:check` and `test:unit` all exit 1 on the owner's machine, for local reasons.
9. The Watch workflow is written to run every 15 minutes. It ran 24 times in 7 days, about every 5 to 8 hours. CI's nightly run, set for 21:00 UTC, starts around 02:00. GitHub is running the schedules late. **[measured; outside this brief, but someone should look]**
10. The cost question is upside down from the brief's assumption: the old runners are free, the new ones are not.

## 5. The brief, line by line

### 5.1 The three rules

**"The full suite runs before anything reaches main, in a merge queue."**

- **Today:** no merge queue. A pull request into `main` (the release) is a `pull_request` event, so path selection applies to it too. The full suite runs after the fact, on the push. `how-we-work.md` covers the gap by hand: "Before `staging` is merged into `main`, `staging` itself is tested as a whole".
- **Allowed here?** Yes. GitHub: merge queues are "available in any public repository owned by an organization". The org is on Free and the repo is public. **[read]**
- **Which branch:**
  - `main`: the release pull request enters the queue. One merge every few days, so it costs almost nothing. This is the brief's rule, literally.
  - `staging`: every finished pull request gets the full suite before it lands. This closes the hole `ci.yml` admits to: "Shared code … does not select [the drawing suites]; a push to staging runs them, which catches it" (after the merge). It adds about 13 minutes between "merge" and "landed".
- **The change:** add `merge_group:` to `ci.yml`'s triggers. The `changes` job already runs everything when the event is not `pull_request`. Then the owner turns on the queue in the ruleset. The three required checks keep their names and `needs`.
- **Risk:** the nightly publish pushes to `main` and `staging` with the deploy key and bypasses the ruleset. A queue rebuilds when the base moves; it does not break. A release is held for the deploy key, so a queue on `main` cannot be proven until that clears.
- **Needs:** go-ahead for one `.github/` change, then ruleset edits only the owner can make (first, the `staging` ruleset itself).

**"Never hide failures."**

- **Today:** one retry (the live router, used once in 100 jobs), timeouts 4 to 10 times the measured time, two shrink-only baselines, no skipped tests.
- **The change:** give the merge queue the recorded router too, keep the live router for the nightly run only as a staleness check, then remove the retry. It changes what pushes to `staging` check, so it is the owner's call.
- **Conflict:** `tests/e2e/README.md` tells a person to run a failed drawing suite once more. It would need the same edit.

**"Never check less."** Binds every tool switch below. Putting Storybook plays under a summary job's `needs` grows the required checks, which the rule allows.

### 5.2 Waiting, under 5 seconds

- **Today:** 43 s / 12m37s per job; 3m09s / 12m26s on the critical chain. Even the 3-second summary jobs wait up to 2m40s at p95 for a machine to run one `echo`.
- **Cause:** 29 jobs a run, 20 at once on Free, several runs at a time, and 25-minute emulator jobs in the same pool.
- **Cancel on a new commit:** already done for pull requests; 10 of 150 runs ended that way. Pushes to `main` and `staging` are never cancelled, on purpose, and `workflow-concurrency-test.mjs` enforces it.

| Option | Waiting it should give | Monthly cost | Needs |
| --- | --- | --- | --- |
| The four built-app suites as one job (94 s of work in four jobs today) | a little less | $0 | one `.github/` change |
| **Done 2026-11-26 (the owner said yes, and wider):** the emulator jobs are off every pull request; they run on each push to `staging` and by hand | frees up to 2 slots for 25 minutes on about 11 pull requests a day | $0 | the owner's decision: it narrows a pull-request check (the push to `staging` still runs it) |
| GitHub Team plan: 60 jobs at once | near zero most of the day **[inference]** | about $4 a seat; the org shows 6 filled seats, so about $24 (**price from memory, not checked today**) | the org owner, billing |
| Blacksmith: no limit on jobs at once | their page: microVMs "boot in under 3 seconds" | $700 to $1,450 at today's volume | the org owner, an account, a card |

- **Measure:** `analyze.mjs` on the next 150 runs. The "waiting removed" row predicts 8m50s / 11m08s if waiting goes to zero and nothing else changes.
- **"Keep machines warm":** Blacksmith's docs describe no warm pool, only fast boot and dedicated capacity. **[read]**

### 5.3 Setup, under 15 seconds

- **Today:** 53 s / 73 s per job; 26.9 job-minutes a run.
- **"Bake the toolchain into the runner image":** GitHub's hosted runners take no custom image. Blacksmith's docs say its runners "boot off of the same image(s) as GitHub's runners" and offer only "contact support" for more. A baked image is **not on offer from either** as documented. Blacksmith's substitute is a sticky disk ($0.50 per GB a month) that can hold `node_modules` and the browser. **[read]**
- **"Cache hits above 95% by seeding from main":** already there. Pull requests go into `staging`, so `staging` is the seed, and it is. The one gap is the system-packages cache, keyed on the exact image version, which misses on the day GitHub rolls an image.
- **"Cache node_modules itself":** not done. The change: cache `node_modules` keyed on the lockfile hash, Node's version and the OS, and skip `npm ci` on an exact hit. Expected 38 s to about 8 s a job **[inference; restoring 117 MB takes 1 to 2 s in the logs]**: about 14 job-minutes a run and 30 s off the critical chain. Risk: a wrong key restores stale packages. The store is full, so drop the npm download cache in the same change.
- **"Blobless clone":** checkout takes 2 s at the median and is already depth-1 everywhere except What changed (3 s). Not worth a `.github/` change alone.
- **Free and first:** one throwaway pull request that runs `npm ci --timing` to find the 16 November slowdown.
- **Floor without a new runner:** about 20 s with `node_modules` cached. Under 15 s needs a disk that is already there.

### 5.4 Slowest job under 35 seconds; no required job waits on another

- **Today:** the slowest job runs for 8m26s at the median.
- **Why 35 s is not reachable without checking less:** a full run is 97 job-minutes of browser work, which is about 170 jobs of 35 s, each starting its own browser and dev server. commuter-test alone is 41 minutes over six parts: it opens every one of about 140 hotspots on a real map in a real browser. The emulator ride is 20 minutes of real time by design.
- **What can be reached [inference]:**
  - Balance phone-test's parts (3m57s, 5m03s, 8m01s; even is about 5m40s). Then commuter-test's 7 minutes is the long pole. Free.
  - Replace fixed waits in the long suites with waits for the thing itself. Size unknown until per-check times are recorded.
  - More commuter parts (6 to 12 gives about 3m30s). Each costs a runner slot and a setup, so it pays only after waiting and setup are fixed.
    - **Dropped (the owner, 22 November).** Since #1137 hid hotspot taps behind `VITE_HOTSPOT_TAPS`, which CI does not set, commuter-test skips its per-hotspot sequence. Its six parts took 2m03s at most on staging's run 45014533363, against 6m42s to 8m19s on run 44974645918 before it. More parts would add jobs and save nothing. The hidden stop-tap checks are to be kept alive by a separate push-only job built with the flag on, once the flag-on branch of the suite is updated to the one-tap RouteCard.
  - Bigger machines with several pages at once inside a job is a rewrite of the long suites, not a setting.
  - A floor of **about 3 to 4 minutes** for the full suite looks reachable with paid runners. Not 35 seconds.
- **"No required job waits on another":** conflicts with `how-we-work.md`: the required checks "keep their names, and their `needs` still cover what they covered". The summary jobs exist to wait. The one edge that can go is the built-app suites waiting about 3 minutes for the build job's artifact: they could make their own preview build (11 s). They stay under "Build and the public map".

### 5.5 Lint, under 1 second: `bun lint`

- **Today:** `eslint .` takes 33 s / 42 s in CI and 30.4 s here. 174 rules are on (`lint\inventory.json`, from `eslint --print-config` on six kinds of file). There is no `.oxlintrc.json`. No rule needs type information (the config uses `strict` and `stylistic`, not the type-checked sets).
- **What `bun lint` is [read: Bun's docs, v1.4.5]:** a built-in linter. "`bun lint` reads your `eslint.config.js` and prints a report matching ESLint 10." ESLint core, typescript-eslint, react-hooks and `import` run natively. "Any other ESLint plugin still runs, in JavaScript." And: "Bun runs your `eslint.config.js`, so anything it imports must stay installed."

| Rule group | Rules on | oxlint (872 rules) | `bun lint` with this `eslint.config.js` |
| --- | --- | --- | --- |
| ESLint core | 72 | 69. Missing: **`no-restricted-syntax`**, `no-dupe-args`, `no-octal` | all 72 in Bun's list; native |
| typescript-eslint (strict, stylistic) | 42 | all 42 by name (5 only as the core rule) | all 42; native, at 8.71 where the repo has 8.72 |
| react-hooks (with the React Compiler rules) | 16 | 14. Missing: `config`, `gating` | all 16; native |
| import-x | 10 | 8. Missing: **`no-restricted-paths`**, **`order`** | names exist under `import`, but the repo's plugin is `import-x`, a different package, so it would run in JavaScript **[inference]** |
| jsx-a11y | 31 | all 31 by name | with an ESLint config it runs "from `node_modules`", in JavaScript |
| check-file | 3 | **none** | none native; runs in JavaScript as a plugin |

  A name match is not proof the options behave the same. 45 of the 174 rules carry options.

- **The rules oxlint cannot replace:**
  - `no-restricted-syntax`: no `enum`; `import.meta.env` only in the env modules; no plain `React.lazy`; no MapLibre call returned from `page.evaluate` in `tests/e2e/` (the rule behind Phase 1's 15% saving).
  - `import-x/no-restricted-paths`: all 16 zones of `app → pages → features → shared → design-system`.
  - `import-x/order`: the four import groups.
  - `check-file`: kebab-case files and folders, every source file inside an area.
  - oxlint's JS plugins could run check-file, but its docs say "JS plugins are currently in alpha". **[read]**
- **So:**
  - **oxlint alone: no.**
  - **`bun lint` on the existing config: possible, nothing dropped in principle.** But ESLint, typescript-eslint and the four plugins stay installed, so "delete ESLint" does not happen, and 44 rules still run in JavaScript, so under 1 second is unlikely. Not measured: Bun is not installed here.
  - **`bun lint` with rules moved to `bunfig.toml`:** ESLint could go, with check-file kept as a plugin and `import-x` rewritten to Bun's `import`. That rewrites the file `.claude/CLAUDE.md` calls the enforcement, and Bun's jsx-a11y would then "follow oxlint". Every changed rule needs a side-by-side.
- **The change, in order:** (1) the owner approves Bun as a dev tool; (2) `bun lint --doctor`, which "doesn't lint or write files" and lists what runs natively; (3) both linters on `staging` and on a branch with one planted violation per custom rule, reports diffed; (4) only then switch the script.
- **Free and now:** stop running ESLint twice. 33 s off the build job, no new tool.
- **Risk:** Bun's native rules are pinned to versions older than the repo's.
- **Needs:** dependency approval; edits to `.claude/CLAUDE.md`'s Stack table ("ESLint 10 + Prettier | Automatic enforcement of these standards") and "Formatting and linting".
- **Conflict:** "Don't add a dependency without asking first. Say what it replaces and why the current stack can't cover it." The honest answer is speed only.
- **"Turn on every rule you can":** separate. Each new rule is its own pull request with the tree cleaned first.

### 5.6 Format, under 1 second: `bun fmt`

- **Today:** 14 s / 19 s in CI, 13.6 s here.
- **What `bun fmt` is [read]:** "All of Prettier's options work, under the same names." Listing `prettier-plugin-tailwindcss` in `.prettierrc` turns on Bun's own class sorting, done "with the project's `tailwindcss`". `cn` is in its default function list. `.prettierignore` works. `--check` exits 1 on a difference.
- **Parity by Bun's own numbers (v1.4.4 post):** 99.1% of Prettier's tests identical; with the Tailwind plugin, 97.9% of JS and TS files matched. Some files will differ.
- **The one place class sorting could silently break:** this repo sets `tailwindStylesheet: ./src/styles/global.css` (Tailwind v4, tokens in `@theme`). Bun's docs name the equivalent as `stylesheet` under `[fmt.sortTailwindcss]` and do not say the Prettier-named key is read.
- **The change:** `bun fmt --check` on `staging`. Zero differences: switch. Some: the owner decides on one formatting commit across the tree, which every open pull request must absorb.
- **Saving:** about 14 s in the build job, and an affordable pre-commit hook.
- **Needs:** the same approval and `CLAUDE.md` edit as lint.

### 5.7 Typecheck, under 5 seconds: `bun check`

- **Today:** `tsc` is already TypeScript 7 native (7.0.2). `npm run typecheck` takes **2.3 s** here; in CI the whole build step takes 6 s / 8 s. **The budget is met.**
- **`bun check` here [read]:** "If `package.json` has a `check` script, `bun check` runs that script instead". This repo's `check` script is the full local check. `bun check` follows TypeScript 7.1 and "reports some cross-file errors that `tsc` drops".
- **Recommendation: keep `tsc`.** The measured reason: already under budget; a switch buys only a second definition of "type-correct".

### 5.8 Tests, under 30 seconds a shard: `bun test`

- **Today:** 240 files, 1,924 tests, Node's runner, one process per file. 31 s / 40 s in CI, 18.4 s here. No Vitest or Jest: every file imports `test` from `node:test` and `assert` from `node:assert/strict`.
- **What would have to change [read: Bun's docs]:**
  - **Discovery.** `bun test` finds `*.test.*`, `*_test.*`, `*.spec.*`, `*_spec.*`. `geo-test.mjs` matches none. Files would be passed by path or `--files-from`. Renaming breaks `CLAUDE.md`: "Unit checks live in `tests/unit/*-test.mjs`".
  - **`node:test` under Bun** is "Partially implemented": tests, suites, hooks, `t.mock` and mock timers work; `mock.module()`, snapshots and reporters do not. The files use `test` (231), the four hooks (11), `mock.method`, `mock.timers`, `mock.callCount`: all on the supported side. Not proven until run.
  - **The TypeScript hook.** `scripts/node/ts-resolve.mjs` uses `module.register`, which Bun lists as a no-op. Bun resolves extensionless imports, `@/` and `index.ts` itself. The hook's other job, defaulting `import.meta.env` to `{ DEV: false }`, needs checking.
  - **Isolation.** Today each file has its own process. The brief asks for `--isolate=modules` in one process, which is weaker. 25 files touch `process.env` or `globalThis`.
  - **Random order:** `--randomize` exists. Anything it turns red is a leak to fix.
- **Side-by-side:** both runners must report the same 1,924 names and results. Fix the Windows-only failures first.
- **Saving:** perhaps 25 s in the build job **[inference]**, which is not on the critical chain.
- **The browser suites are not `bun test` material.** They are Playwright scripts with their own harness.
- **Needs:** dependency approval; `CLAUDE.md`; `tests/unit/README.md`.

### 5.9 Install and scripts: Bun; delete npm, Prettier, ESLint

- **Today:** npm with `package-lock.json`. Not in the repo, so nothing to delete: yarn, pnpm, oxlint, Vitest, Jest.
- **What a switch touches:** the lockfile (Dependabot's three npm groups read it), `npm audit` in `security.yml` (a check, so it needs an equal), `npx cap sync` and Gradle, Playwright, Vite, Storybook, every `npm run` in 13 workflows, `docs/`, `package.json`'s `overrides`. `.github/`, `android/` and `supabase/` all need the owner's yes.
- **Recommendation:** last, if at all. A `node_modules` cache takes most of the saving for free, and the risk is the widest here.

### 5.10 Shards

- **"Buy cores before shards":** runners are 4 vCPU; each browser job uses about one browser and one dev server. The unit checks already use every core.
- **"Each shard its own throwaway database":** pull-request suites use stand-ins, not a database. `database.yml` already starts a throwaway Postgres. On pushes the drawing suites "read the live tables", which a merge queue should not do.
- **"Split any test file over 20 seconds":** no unit file can exceed 18 s (all 240 finish in 18 s). Every browser suite but six is over 20 s, and they are sequences on one page. The repo's way is parts (`COMMUTER_PART`, `PHONE_PART`).
- **"Balance shards from file times that main records":** nothing records times today. Proposal: every full run on `staging` writes each part's and check's duration as an artifact.
- **"Prove the shards together ran every file":** Phase 1 did it once by hand for phone-test. Proposal: a check on every full run. Each part writes its check names; a job fails if the union is short or a name repeats.

### 5.11 Fewer tests, on evidence

- **The change:** a two-week ledger, one line per red job: the job, the check, "caught a regression" or "detected a change", the fix. No tool needed. The 21 reds here are the first entries once someone reads their logs.
- **Never delete:** `database.yml`'s migrations and row-security job, the review suites, `studio-two-editors-test` (concurrency), the account and claim suites (authorization), the `check-build` guards (no studio code on the public page).
- **"Ban their patterns in AGENTS.md":** there is no `AGENTS.md`. The rules are in `.claude/CLAUDE.md` and `docs/agents/`. Editing either needs the owner.
- Phase 1's Decision 3 (all ~140 hotspots in commuter-test) is the obvious candidate, and exactly what must not be cut without the ledger.

### 5.12 Shape

- **Today:** lint, format, build and unit checks are steps in one job, one after another: 14 + 33 + 6 + 31 = 84 s, and the first failure stops the rest. A formatting slip hides whether lint and the unit checks pass.
- **The change:** start the four together inside the same job, wait for all, print each result, fail if any failed. About 40 s on 4 cores **[inference]**, every failure listed. Same checks, same job name, same `needs`.
- With Code health no longer running ESLint, the build job goes from 2m58s to roughly 1m30s **[inference]**.

### 5.13 Selection

- **What exists:** the `changes` job reads `git diff --name-only` and sets six outputs with `case` patterns. `areas.json` only warns when a pull request spans areas.
- **Inputs that rerun everything today [read: ci.yml lines 126 to 165]:**
  - anything matching no pattern: `src/shared/`, `src/design-system/`, `src/features/routes/` outside `geo` and `map`, `src/features/locator/`, `src/styles/`, `package.json`, the lockfile, `vite.config.ts`, `tsconfig.json`, `eslint.config.js`, `.github/`, most of `scripts/`;
  - `tests/e2e/lib/*` and `tests/e2e/fixtures/*`.
  - **"Everything" does not include the drawing suites** unless the diff touches the editor, `routes/geo`, `routes/map`, the drawing suites or four helper files. A change to `ci.yml` itself does not run them.
- **Inputs that run nothing:** `docs/*` and any `*.md`.
- **"Hide a real change and confirm CI goes red":** not run (it needs a pull request). The file predicts the result: break something in `src/shared/` that only the drawing suites exercise, and the pull request stays green while `staging` goes red after the merge. That experiment is the evidence for a merge queue on `staging`.
- **"Only the tests the diff can reach":** an import graph would be finer than path prefixes, but shared code reaches everything and 70% of pull requests already run everything. Selection alone cannot bring the median under a minute.

### 5.14 Local, under 9 seconds: hk hooks

- **Today:** no hooks. `how-we-work.md`: "A simple change … is pushed without running the checks; CI still runs on its pull request."
- **hk [read: hk's docs, v2.13.0]:** config in `hk.pkl`, its own evaluator built in; installed with mise, brew, cargo or a binary. The page does not say whether Windows is supported. The owner works on Windows.

| Hook | Runs | Time today | Budget |
| --- | --- | --- | --- |
| pre-commit | Prettier and ESLint on staged files | a few seconds for a few files **[inference]**; 13.6 s + 30.4 s on the whole tree | 9 s |
| pre-push, "the same check as CI" | format, lint, long files, glossary, architecture, typecheck, build, unit checks | 13.6 + 30.4 + 2.3 + 18.4 = **65 s** before the build, which I did not run | 9 s |

- **Pre-push cannot meet 9 s** until format and lint are near-instant, and the unit checks alone take twice the budget.
- **Fix first, all free:** ignore `.claude/worktrees/` in lint and format; the Windows-only unit failures; the drive-letter case that loads React twice.
- **Conflict:** a pre-push hook that runs CI's check contradicts "pushed without running the checks". The page would need the owner's edit.
- **Needs:** a new tool on every machine and container (dependency approval), and proof it runs on Windows.

### 5.15 Keep it fast: fail any job over its budget

- **Today:** `timeout-minutes` of 5 to 40, far above measured times.
- **The change:** a budget per job in one file, checked by a last step that fails the job.
- **Risk:** on shared free runners a job's p95 is 1.25 to 2 times its median for reasons that are not the code's (phone-test 2 of 3: 3m57s / 7m47s). A tight budget would fail good commits, and the brief forbids the retry that would follow. Budgets fit steady hardware.
- **Proposal:** record and warn for two weeks, then set each budget from its own p95 and make it fail. The brief says fail from the start; the owner should choose.

### 5.16 Blacksmith, the Android jobs, KVM and macOS

**[read: Blacksmith's docs and pricing page]**

- **Install:** a GitHub App on "every repository that uses `runs-on: blacksmith-*`"; it "relies on GitHub's org level runner registration API". The org owner installs it. Fork pull requests (4 of the 150 runs) are not covered by the pages I read.
- **Price:** $0.004 a minute for 2 vCPU Linux x64; 3,000 free minutes a month; sticky disks $0.50 per GB a month. I assume price scales with vCPUs ($0.008 for 4). **[inference]**
- **Open source:** an "OSS Program" by application, for "an actively maintained public repo, a permissive OSS license, and clear community usage". Para is MIT and public. Apply before paying.
- **Custom image:** not documented. **Warm machines:** not documented.
- **KVM:** "Nested virtualization is only supported on x64 runners". The emulator jobs would work on paper. Their 20 minutes is the test, not the runner.
- **macOS:** nothing in this repo uses it.
- **Repo rule for any new action:** `actions-pinned-test.mjs` requires a full commit pin.

| What moves | Job-minutes per 30 days | 2 vCPU at $0.004 | 4 vCPU (what GitHub gives free), assumed $0.008 |
| --- | --- | --- | --- |
| Everything | 180,700 | about $710 | about $1,430 |
| CI only | 151,600 | about $590 | about $1,200 |
| Today, GitHub | 180,700 | $0 | $0 |

Faster machines would shorten jobs and lower these. Blacksmith's pages assume "2x faster"; I have no measurement.

## 6. The decision only the owner can make

70% of pull requests select the full browser suite, and its floor is minutes. Three ways to square that with a 1-minute median:

1. **Keep "result" meaning what it means today** (browser suites included). Realistic with paid runners: about 4 to 5 minutes at the median. With free changes only: about 10 to 11.
2. **Make the pull request's required result the fast checks only** (about 1 minute), and run every browser suite in a merge queue on `staging` before the merge lands. The 1-minute median is then real, and so is a 9 to 13 minute wait in the queue. Nothing is checked less, but a pull request can show green and then be thrown out of the queue. The three required names stay; what sits under them on a pull request changes, which `how-we-work.md` says must not happen quietly.
3. **A middle:** the pull request runs the fast checks plus the suites its own area reaches; the queue runs everything.

Decide this before buying runners: option 2 needs far fewer paid minutes than option 1.

## 7. The order of changes

Biggest measured bucket first, then cost. One small pull request each, with `analyze.mjs` numbers before and after. A `.github/` change merges alone, and nothing merges after it until `staging`'s push run is green with the job count checked.

### No account, secret, dependency or bill

| # | Change | Bucket | Touches `.github/` | Expected | Job count |
| --- | --- | --- | --- | --- | --- |
| 1 | Record each check's and part's duration on full runs | running (evidence) | no | none yet; needed for 2, 3 and shards | same |
| 2 | ~~Balance phone-test's three parts by measured time~~ Skipped (hub, 22 November): measured on run 44974645918, phone-test's parts take 5m06s at most and commuter-test's 6m42s to 8m19s, so phone-test is not the long pole (`check-times/README.md`) | running | no | none | same |
| 3 | Replace fixed waits in commuter-test and phone-test, one suite a pull request | running | no | unknown until 1 | same |
| 4 | Find why `npm ci` slowed (a throwaway pull request with `--timing`) | setup | yes, never merged | up to 30 s a job if it can be undone | same |
| 5 | Cache `node_modules`; drop the npm download cache | setup | yes | 38 s to about 8 s a job | same |
| 6 | Code health stops running ESLint again | running | yes, with `scripts/checks/health.mjs` | 33 s off the build job | same |
| 7 | Build job: the four checks at once, every failure listed | running, honesty | yes | 84 s to about 40 s | same |
| 8 | The four built-app suites as one job, making their own preview build | waiting | yes | 3 fewer jobs; no wait on the build job | 29 to 26 |
| 9 | Every part proves its checks; a job fails if the union is short | never lie | yes | closes a gap | +1, or inside a summary job |
| 10 | Storybook plays under a summary job's `needs` | never check less | yes | a red Storybook blocks | same |
| 11 | Ignore `.claude/worktrees/` in lint and format; fix the Windows-only unit failures | local | no | `npm run lint` exits 0 here | same |
| 12 | The failure ledger, two weeks | fewer tests | no | evidence | same |

5 to 10 are six `.github/` changes, one at a time. 1, 2, 3, 11 and 12 can run beside them.

Status on 22 November:

- **Done:**
  - 1 (`check-times/`, #1132);
  - 3 for commuter-test (#1144: `closeCard` waits on a condition; no measurable speed-up);
  - 8 (#1146): a push went from 33 jobs in 9m41s to 29 jobs in 7m34s, and a pull request from 32 jobs to 28;
  - 11 (#1122): lint and format skip other sessions' worktrees, and the local checks are green on Windows;
  - 14's `.github/` part (#1115): `ci.yml` runs on `merge_group`. The rulesets are the owner's.
- **Skipped:** 2, because phone-test is not the long pole.
- **Since then, the same day:**
  - #1149: commuter-test runs in 2 parts, not 6. Since #1137 hid hotspot taps behind `VITE_HOTSPOT_TAPS`, each part took 2m03s at most, so six parts only added setup. A push took 7m22s with 25 jobs.
  - #1154: a push to `staging` also runs commuter-test with hotspot taps on (`taps-on`, 6 parts), so the hidden checks still run before `main`. A push now has 31 jobs and takes 8m37s, of which 1m15s was waiting for runners. A pull request has 24 jobs.
  - #1156, reverted in #1158: contribute-test's form timeout used `page.clock.fastForward` instead of `runFor`. It passed 6 local runs and the pull request's run, then failed on the push. Closing a stop's map releases the form's hold through two passive effects, which land after the test has already jumped. `fastForward`'s single tick could still see the hold, where `runFor`'s later ticks saw the release. It saved about 15 s of contribute-test's 6.5 minutes, so it is not being tried again. Recorded in `../ci-flakes/ledger.md`.
  - #1159: the revert's push then failed in account-test. A race in the test that predates today: it read a History card's text before the card had drawn it. It now waits for the card's status words first. Also in the ledger.
- **Where a pull request's time goes now:** contribute-test, at about 6.5 minutes, is the long pole. Its 40 fixed waits each either prove something does not happen (22) or let something settle (18). Shortening them is item 3's work, with a condition for each, not a shorter wait.
- **Lessons:**
  - "The state is fixed through the jump" does not hold right after a click that changes it. A clock jump straight after a click races the click's effects.
  - Passing local runs, even six, do not prove there is no race. A race can pass every time on one machine and fail on another.

### Needs the owner first

| # | Change | Bucket | What it needs |
| --- | --- | --- | --- |
| 13 | Turn on the `staging` ruleset (already written in `staging-protection.md`) | rule 1 | the owner's step |
| 14 | `merge_group` in `ci.yml`; merge queue on `main`, then `staging` | rule 1 | a `.github/` change, then ruleset edits; the decision in section 6 |
| 15 | Recorded router in the queue; drop the drawing retry | rule 2 | the owner's call on live services |
| 16 | More concurrency: GitHub Team, or Blacksmith | waiting | billing, the org owner |
| 17 | `bun fmt` after a side-by-side | format | dependency approval; `CLAUDE.md` |
| 18 | `bun lint` after `--doctor` and a side-by-side | lint | the same |
| 19 | `bun test` after a side-by-side of 1,924 tests | tests | the same; `tests/unit/README.md` |
| 20 | hk hooks, once 11, 17 and 18 are in | local | dependency approval; proof on Windows; `how-we-work.md` |
| 21 | Budgets that fail | keep it fast | steady runners first |
| 22 | Bun as the installer | setup | the widest change; last |

## 8. Needs the owner

1. **Decision:** what "a pull request's result" means (section 6).
2. **Decision:** merge queue on `main` only, or on `staging` too.
3. **Decision:** may the queue and pushes use the recorded router, with the live one nightly only?
4. **Decided 2026-11-26, yes, for every pull request:** the emulator jobs run on each push to `staging` and by hand, not on pull requests (`docs/agents/staging-protection.md`, "Where the emulator runs").
5. **Org settings only he can change:** the `staging` ruleset, then merge queue in the rulesets.
6. **Go-ahead for `.github/` changes:** about eight, one at a time (5 to 10, 14, 15).
7. **Dependency approval, with `.claude/CLAUDE.md` edits:** Bun (replacing Prettier; running or replacing ESLint; replacing Node's test runner for the unit checks) and hk.
8. **A bill, if he wants waiting gone:**
   - GitHub Team: about $24 a month for 6 seats (price from memory; check GitHub's pricing page), or
   - Blacksmith: about $590 to $1,430 a month at today's volume, plus about $5 for sticky disks; an account, the GitHub App on the org, a card. Apply to their OSS Program first.
9. **No new secret** is needed by anything above.
10. **Still open from before:** the deploy key that holds the release also holds any proof of a queue on `main`.

## 9. Before and after

"Before" is measured. Every "after" is an estimate.

| | Before (measured) | After, free changes only | After, plus 60 jobs at once | After, paid runners and option 2 of section 6 |
| --- | --- | --- | --- | --- |
| Pull request result, p50 | 11m50s | about 10 to 11 min | about 7 to 8 min | about 1 min for the required checks; 5 to 9 min more in the queue |
| Pull request result, p95 | 22m08s | about 20 min | about 10 to 11 min | about 2 min; queue about 10 min |
| Waiting on the chain, p50 / p95 | 3m09s / 12m26s | about the same | seconds / about 1 min | seconds |
| Setup per job, p50 | 53 s | about 25 s | about 25 s | about 15 s |
| Slowest job running, p50 | 8m26s | about 7 min | about 7 min | about 3 to 4 min |
| Job-minutes per full run | 124 | about 105 | about 105 | unknown |
| Job-minutes per 30 days, all workflows | 180,700 | about 155,000 | about 155,000 | lower; unknown |
| Monthly cost | $0 | $0 | about $24 | roughly $300 to $1,400 |

Assumptions:

- Free changes: setup falls 30 s a job, phone-test's long part falls 1 minute, the build job 1m30s, three jobs fewer. Waiting is unchanged because the 20-job limit is.
- 60 jobs at once: waiting near zero at the median, from the "waiting removed" row less the free savings.
- Paid runners: steadier, faster machines, commuter-test in 12 parts, the queue runs the full suite. Cost is the measured minutes at $0.004 to $0.008, halved at the low end if machines really are twice as fast. None of this is measured.

## 10. What I could not measure, and what I am unsure of

**Could not measure:**

- **`bun lint`, `bun fmt`, `bun test`, `bun check` on this repo.** Bun is not installed and I installed nothing. Every statement about them is from Bun's docs.
- **`npm run build` locally**, by instruction.
- **Why `npm ci` slowed.** The logs do not show it.
- **Which of the 21 red runs were flakes.** I did not read their logs.
- **The selection experiment.** It needs a pull request.
- **Blacksmith's speed** on these suites, and whether it bills by the minute or the second.
- **Per-file unit test times.** Only the total.

**Unsure of:**

- Blacksmith's price above 2 vCPU (assumed to scale with vCPUs).
- GitHub Team's price, and whether 60 jobs removes waiting entirely at this volume.
- Whether `bun lint` runs `import-x` rules natively or in JavaScript.
- Whether `bun fmt` reads `tailwindStylesheet` from `.prettierrc`.
- Whether hk runs natively on Windows.
- The cause of the React-loaded-twice unit failures.
- The week measured was unusually busy and growing. Monthly figures scale from it.

## 11. Sources read today

- GitHub: Actions limits; GitHub-hosted runners; Managing a merge queue; merge queue availability.
- Bun (site header "Bun v1.4.5"): `bun.com/docs/lint`, `/docs/lint/rules`, `/docs/lint/plugins`, `/guides/lint/migrate-from-eslint`, `/docs/format`, `/docs/runtime/check`, `/docs/test/parallel`, `/docs/test/discovery`, `/docs/test/writing-tests`, `/docs/runtime/nodejs-compat`, the v1.4.4 release post.
- oxlint: `oxc.rs/docs/guide/usage/linter/rules.html` (872 rules), `…/js-plugins.html`.
- Blacksmith: `docs.blacksmith.sh/blacksmith-runners/overview`, `blacksmith.sh/pricing`, the sticky disks page (through a search result).
- hk: `hk.jdx.dev/getting_started.html`.
- Repo: everything under `.github/`, `.claude/CLAUDE.md`, `docs/agents/how-we-work.md`, `main-protection.md`, `staging-protection.md`, `eslint.config.js`, `.scratch/ci-speed/phase-1-summary.md`, the titles of `.scratch/ci-flakes/issues/`, `tests/e2e/README.md` (the services section), `tests/unit/README.md`, `areas.json`.
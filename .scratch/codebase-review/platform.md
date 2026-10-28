# Codebase review 2026-10-28: The platform

The machinery around the app (the offline worker, the build, the two Cloudflare Workers, the nightly map publish and the weekly backup) is careful and mostly well guarded, and `npm run check` passes on `staging` (1,172 unit checks, every build guard green).
The biggest problems are about which branch things live on: the live site is built from `staging`, but the nightly map goes only to `main`, and the backup's key is only on `staging`, so the backup due on Sunday will fail.
Two settings make it too easy to get round the rules: the key that lets the publish push straight to `main` can be used by any branch, and the contributor page can be shown inside another website's frame.

## Findings

### platform-01: The live site never gets the nightly map

- Severity: bug
- Where: `.github/workflows/publish-map.yml:104` (`ref: main`), `:169` (`git push origin HEAD:main`); `wrangler.jsonc` (the live Worker `para`, built from `staging` until the release)
- What happens: An editor approves a route on Monday. At 04:00 on Tuesday the publish writes the new `public/data/` and commits it to `main` only. The live site, `para.para-ph-info.workers.dev`, is built from `staging`, so it keeps serving `staging`'s copy of the map until someone merges `main` back into `staging` by hand. That has happened twice (#318, #372), and nothing in CI or the workflows does it. The commuter sees a map that is missing approved changes, and the editor sees the change in the studio's Public map view but not on the site. Nobody has noticed yet only because no approved data has changed since 2026-10-22. You can see the two branches differ today: the live index's attribution says "Para contributors", which is `staging`'s hand-edited copy, while `main` still says "ParaPo".
- Fix: Until the release puts `main` back on the live site, make the publish job also push its data commit to `staging` (one more `git push` of a merge, using the same key). Or switch the live Worker's production branch back to `main` now. Remove the extra push when the custom-domain plan's step 05 lands.
- Size: S
- Owner decides: yes (which branch the commuters' site is built from)

### platform-02: Sunday's scheduled backup will fail: the owner's public key is only on `staging`

- Severity: bug
- Where: `.github/workflows/backup.yml:95` (schedule), `:118`, `:130` (key check); `.github/backup/owner-public-key.asc` (on `staging`, not on `main`)
- What happens: Scheduled workflows run from `main`. `main` has `backup.yml` but not `owner-public-key.asc` (added on `staging` in #427). On Saturday 2026-10-31 at 18:00 UTC (Sunday 02:00 in Manila), the first step finds no key and the run fails. That means no backup that week, and a failure email to the owner. The one good backup so far (run 40568463549) was started by hand on a feature branch. Every week until the next release to `main` gets the same red run, and a ride recorded in that time has no off-site copy.
- Fix: Get `.github/backup/owner-public-key.asc` onto `main` before Saturday, either with the next release or a one-file pull request into `main` (only the owner merges into `main`). Then start "Run workflow" on `main` once to prove it works.
- Size: S
- Owner decides: no (the owner has to merge into `main`, though)

### platform-03: The deploy key and the backup secrets can be used from any branch

- Severity: security
- Where: `.github/workflows/publish-map.yml:105` (`secrets.PUBLISH_DEPLOY_KEY`, no `environment:`); `.github/workflows/backup.yml` (the five `secrets.*`, no `environment:`)
- What happens: `PUBLISH_DEPLOY_KEY` is a repository secret, and it is the one key the `main` ruleset lets push straight to `main`. Anyone, or any session, that can push a branch can add a workflow on that branch that uses this key to push to `main` without a pull request. That breaks the rule that "only the owner merges into `main`", and on the custom domain a push to `main` deploys to commuters. `BACKUP_DATABASE_URL` is the same kind of secret: it is a login that reads every contribution with row security allowing everything, and run 40568463549 shows the backup can already be started from a feature branch. The tiles workflow already does this properly: its R2 keys sit in a GitHub Environment that only allows `staging` and `main`.
- Fix: Move `PUBLISH_DEPLOY_KEY` into a GitHub Environment (for example `publish`) that allows the `main` branch only, and add `environment: publish` to the publish job. Do the same for the five backup secrets (`backup`, `main` only). This is a settings change, plus one line in each workflow.
- Size: S
- Owner decides: no (only the owner can change the repository settings)

### platform-04: The contributor page can be put inside another site's frame

- Severity: security
- Where: `public/_headers:21` (the frame rules cover `/studio/*` only)
- What happens: `/contribute/` has a sign-in, a create-account form with a password, the consent "I agree", and delete buttons for uploads. A request to the live site today returns no `X-Frame-Options` and no `frame-ancestors` for `/contribute/`. Only `/studio/` has them. Another site can load the contributor page in an invisible frame and trick a contributor into tapping "agree" or "delete" (clickjacking). The public map has no account and nothing to steal, but the contributor page does.
- Fix: Add `/contribute/*` with `X-Frame-Options: DENY` and `Content-Security-Policy: frame-ancestors 'none'` to `_headers`, as `/studio/*` already has. Keep it out of the `/*` block, as the file's own comment explains.
- Size: S
- Owner decides: no

### platform-05: The deploy key sits on the runner's disk while third-party code runs

- Severity: security
- Where: `.github/workflows/publish-map.yml:103-106` (`ssh-key`, `persist-credentials: true`), `:127` (`npm ci --omit=dev`)
- What happens: The checkout writes the deploy key, which can push to `main`, to a file and keeps it for the whole job. After that, `npm ci` runs the install scripts of every runtime dependency and its sub-dependencies, and the publish runs code from `src/` and `zod`. None of the 44 runtime packages has an install script today, but a future version of any of them would run with the key readable on disk.
- Fix: Check out without the key (`persist-credentials: false`), add `--ignore-scripts` to `npm ci`, and give the key only to the commit step (write it to a temporary file, set `GIT_SSH_COMMAND`, and delete it afterwards).
- Size: S
- Owner decides: no

### platform-06: CI skips the right suites for two shared pieces

- Severity: test
- Where: `.github/workflows/ci.yml:100` (`src/shared/ui/turnstile.tsx` → studio only), `:102` (`src/features/locator/*` → public only); the files that use them: `src/features/contribute/upload-check.tsx:1`, `src/features/contribute/account/account-panel.tsx:3`, `src/app/studio/workshop.tsx:5`
- What happens: Each pull request is sorted into "public", "studio" or both. A pull request that changes only `turnstile.tsx` runs the studio suites but not upload-test, account-test, claim-test or profile-test, even though the contributor page draws Turnstile before a first upload and on its account screens. A change that breaks the contributor's first upload would show a green pull request. In the same way, a pull request that changes only `src/features/locator/` skips every studio suite, even though the studio's workshop draws `CommuterLocation`.
- Fix: Move `src/shared/ui/turnstile.tsx` and `src/features/locator/*` to the `*) public=true; studio=true` branch, the same as other shared code. It is a two-line change to the `case`.
- Size: S
- Owner decides: no

### platform-07: Phones keep last month's map tiles next to this month's

- Severity: robustness
- Where: `workers/tiles/src/styles.ts:47` (`tiles: [${origin}/{z}/{x}/{y}.pbf]`); `vite.config.ts:487-494` (`basemap-tiles`, `CacheFirst`, 30 days)
- What happens: A tile's address is the same for every monthly build. The offline worker answers tiles cache-first for up to 30 days, so after the monthly build on the 3rd, a commuter's phone shows the old tiles for every place it has already seen and new tiles for every place it hasn't. Where a road was added or redrawn, it stops at the edge between an old and a new tile, for up to a month. Nobody has noticed yet: the first live build was on 2026-10-27.
- Fix: Have the Worker's style rewrite add the build to the tile address (`${origin}/{z}/{x}/{y}.pbf?v=${file}`), since it already knows `current.file`. The worker's rule already accepts a query, the style is refreshed in the background, and a new build then means new addresses everywhere. The `?v=` is ignored by the Worker's tile route, so nothing else changes.
- Size: S
- Owner decides: no

### platform-08: The offline worker's page code breaks a few of the standard's rules

- Severity: standard
- Where: `src/features/published-map/pwa.ts:57`, `:102`; `src/features/published-map/status.ts:35`; `src/features/published-map/notices.tsx:11-30`; `src/features/locator/use-compass.ts:45`, `use-camera-let-go.ts:19`, `dot-gaze.ts:110`; `src/shared/ui/use-sheet-gestures.ts:165`
- What happens:
  - `pwa.ts:102` reads the basemap style from the network with `as { sprite?: string; ... }` instead of checking it with Zod. If `sprite` is ever the array form MapLibre allows, the worker would ask for `[object Object]@2x.json`.
  - `pwa.ts:57` calls `r.update()` every hour without a `catch`. An installed app left open with no network logs an unhandled rejection every hour.
  - `useMapAge` (`status.ts:35`) fetches in an effect and copies the result into state, which the standard forbids ("never use an effect to fetch data").
  - `Notices` types its props inline instead of with a `NoticesProps` interface.
  - Four `as` casts have no comment saying why they are safe (`as unknown as` in `use-compass.ts`).
  - Nobody notices any of this yet. It is the code a new contributor would copy.
- Fix: Parse the style with a small Zod schema, and add `.catch(noop)` to the hourly update. Have `useMapAge` read the shared `fetchIndex()` result with `useSyncExternalStore`, as `useOffline` already does, or with `use()`. Add `NoticesProps`, and either give each `as` its one-line reason or replace it with a type guard.
- Size: S
- Owner decides: no

### platform-09: Comments record history: dates, who asked, what the code used to do

- Severity: standard
- Where: `scripts/checks/check-build.mjs` (15 such lines), `vite.config.ts` (14), `scripts/publish/publish-map.mjs` (13), `wrangler.jsonc` (3), `.github/workflows/publish-map.yml` (3), `.github/workflows/ci.yml` (2)
- What happens: The standard says history goes in commits and pull requests, not comments. These files explain themselves in terms like "the cheap-phone plan, step 14, 2026-10-05", "the owner's ask of 2026-09-30", "It was 5 m and 5 decimals until 2026-09-25" and "(355 before step 14)". The *why* behind these comments is good and worth keeping. The dates and before/after numbers make the three biggest platform files longer and slower to scan, and the numbers go stale (the "385 kB" app and "22 kB" map file in `vite.config.ts:140-141` were measured on 2026-10-05).
- Fix: When each of these files is next split (platform-10), drop the dates, names and old numbers and keep the reasons. Make it its own pass, not part of a behaviour change.
- Size: M
- Owner decides: no

### platform-10: Three platform files are four to six times the size limit

- Severity: simplification
- Where: `vite.config.ts` (655 lines), `scripts/publish/publish-map.mjs` (677), `scripts/checks/check-build.mjs` (861)
- What happens: `vite.config.ts` holds seven plugins (chunk list, manifest stripping, stylesheet order, early map file, MapLibre worker, preconnect, out-dir), the whole offline-worker setup and the chunk groups. A change to any one of them means reading all 655 lines. `publish-map.mjs` reads the database, runs the board guard, assembles the files, writes them and reports, all in one top-level script with no functions to test. Its guards are tested only because they were moved out (`shrinkGuard`, `boardGuard`, `privacyProbe`). `check-build.mjs` holds eight separate proofs in one file.
- Fix: Move the plugins into `scripts/node/vite-plugins/` (two already live in `scripts/node/`) and the offline-worker setup into `scripts/node/offline-worker.ts`. Split `publish-map.mjs` into read, assemble and write modules. Give each of the eight proofs in `check-build.mjs` its own file under `scripts/checks/build/`.
- Size: L
- Owner decides: no

### platform-11: The tiles research is still in the repository, with a copied file

- Severity: simplification
- Where: `.github/workflows/tiles-spike.yml`; `scripts/research/tiles-*.mjs` (8 files, plus `tiles-render.html` and its Vite config); `scripts/research/tiles-pmtiles.mjs` (the same 178 lines as `scripts/tiles/pmtiles.mjs` except the header comment); `.github/workflows/make-app-signing-key.yml`
- What happens: The spike's question was answered and the monthly build and the Worker are live, but the spike workflow still runs on any pull request that touches `scripts/research/tiles-*`. That is a 90-minute Planetiler job, built twice. Its PMTiles reader is a copy, so a fix to one copy will not reach the other. `make-app-signing-key.yml` was a one-time job: `android/release-key.p12.enc` exists, so it now only refuses to run.
- Fix: Delete `tiles-spike.yml` and the `tiles-*` research scripts. The tickets in `.scratch/own-tiles/` keep the findings. If anything still needs a reader, have it import `scripts/tiles/pmtiles.mjs`. Move `make-app-signing-key.yml` to the archive, or delete it and keep its steps in ADR 0006.
- Size: S
- Owner decides: no

### platform-12: Script file names aren't kebab-case, and no `.mjs` is linted

- Severity: standard
- Where: `scripts/publish/boardGuard.mjs`, `lineFile.mjs`, `privacyProbe.mjs`, `shrinkGuard.mjs`, `withoutLines.mjs`; `scripts/research/phoneSpeedParts.mjs`; `eslint.config.js` (`SOURCE` lists `.ts` and `.tsx` only)
- What happens: The standard says every file name is kebab-case. These six are camelCase next to `publish-map.mjs` and `app-release.mjs` in the same folders. The check-file rule only looks at `src/`, so nothing catches it. More importantly, ESLint never reads any `.mjs` file: the publish, the build guard, the tiles scripts and every test. `no-console`, the import order and unused-variable checks don't apply to the code that pushes to `main` and deletes from R2.
- Fix: `git mv` the six files to kebab-case and update their imports. Add `scripts/**/*.mjs` and `tests/**/*.mjs` to ESLint with `js.configs.recommended` and Node globals, and fix what it finds in a separate change.
- Size: M
- Owner decides: no

### platform-13: CI spends minutes on setup it repeats in every job

- Severity: simplification
- Where: `.github/workflows/ci.yml:183`, `:268`, `:331` (`npx playwright install --with-deps chromium` in each of 24 suite jobs); `:212` (three suites build the app again); `:102` (contributor-page changes count as "public")
- What happens: Every suite job reinstalls Chromium and its system packages without a cache. pwa-test, handover-test and contribute-offline-test each run `npm run build` again (two typechecks, Vite and the guards), on top of the build job. A pull request that only changes `src/features/contribute/` runs all 17 public jobs, including commuter-test's three parts (about 20 minutes each), which never open the contributor page.
- Fix: Cache `~/.cache/ms-playwright` keyed on the Playwright version. Build once in the build job (with `VITE_BASEMAP_HOST` set to OpenFreeMap), upload `dist/` as an artifact, and have the three preview suites download it. Add a third scope, "contribute", that runs the contributor suites and the build only.
- Size: M
- Owner decides: no

### platform-14: Gaps in what the tests prove about the platform

- Severity: test
- Where: `.github/workflows/ci.yml:211-212` (the preview suites build against OpenFreeMap); `scripts/tiles/upload.sh:43-63` (deleting old archives); `tests/e2e/review-test.mjs`, `review-demo-test.mjs`, `review-publication-test.mjs`, `review-route-picker-test.mjs`, `contributions-preview-test.mjs` (not in any workflow)
- What happens:
  - The offline worker's rules for Para's own tile server (tiles at the root, `/styles` and `/assets`) are what every commuter's phone uses now. Only a unit test checks them, by matching their regular expressions. pwa-test and handover-test, which prove "the map draws offline from the worker's cache", run only against OpenFreeMap's addresses.
  - `upload.sh` deletes builds from the live bucket, and no test runs that logic. Deleting the file `current.json` points at would blank every commuter's map.
  - The five review and preview suites never run in CI, so the draft → approve → publish flow is proven only when someone remembers to run them.
- Fix: Run pwa-test a second time with `VITE_BASEMAP_HOST=https://para-tiles.para-ph-info.workers.dev` and Playwright routes standing in for that host. Move the choice of what to delete in `upload.sh` into a small Node function with a unit test. Add a job that starts the isolated preview (`scripts/preview/README.md`) and runs the review suites at least nightly.
- Size: M
- Owner decides: no

### platform-15: The old site on the previous Cloudflare account still serves an old copy of the app

- Severity: robustness
- Where: `https://parapo.villaralvorovic2.workers.dev` and `https://staging-parapo.villaralvorovic2.workers.dev` (both answer 200, titled "Para Po"); `workers/tiles/src/cors.ts:2-3`, `:10` (still allowed to read the tiles)
- What happens: The site has moved to `para.para-ph-info.workers.dev`, but the old Worker still answers with a build from before the rename. Its map happens to match today's, but nothing will ever update it, and any phone that installed it from there keeps an app nobody maintains. The tiles Worker still accepts that site's requests, so it keeps working and keeps looking current.
- Fix: Delete (or redirect) the old `parapo` Worker on the old account. Then remove its three origins from `cors.ts`, its line in `workers/tiles/README.md`, and its test in `tiles-worker-style-test.mjs`.
- Size: S
- Owner decides: yes (a public address goes away)

### platform-16: The oldest map file shapes are past their retirement date

- Severity: simplification
- Where: `scripts/publish/publish-map.mjs` (header: `map.json` "for one release", "Drop it a month at least after the index ships", 2026-09-29), `public/data/map.json` (113 kB), `public/data/index.json`; `src/features/routes/published/map-file.ts` (`STORED_OLD`)
- What happens: Every publish still writes five versions of the map: shapes 1 to 5, about 560 kB in all. Shape 1 (`map.json`) was meant to last one release and its month ran out this week. Each extra shape is more code in `shapes.mjs` and `withoutLines.mjs`, and every daily run checks three older indexes.
- Fix: Decide a date to stop writing `map.json` (shape 1) and, once no installed app reads it, `index.json` (shape 2). Then remove them from `publish-map.mjs`, the workflow's check loop and `STORED_OLD`.
- Size: S
- Owner decides: yes (the published map's format)

## What is good

- `check-build.mjs` proves from the built files, not the source, that no studio or contributor code and no Supabase client reaches the public page, with a positive check for each proof. Keep this as the model for future guards.
- The publish refuses to blank the map: a shrink guard that allows for deliberate takedowns, a board guard, a privacy probe on every private table, a byte-identical file when nothing changed, and one issue that tells the owner.
- The tiles pipeline is careful: never reusing a file name, a size check before moving `current.json`, never deleting the live or previous build, archives opened with an etag check, and secrets kept in an environment limited to `staging` and `main`.
- The offline worker only stores JSON or SVG where the host answers a missing file with the page. It marks stored copies so the page can honestly say "Not refreshed", and only precaches what the public page loads.
- The handover from the old app is covered from both ends: a unit test on cache names, and a headless test with the real old worker installed first.

## Outside my area

- `public/data/` on `staging` was hand-edited by the rename commit (4407e2a, the attribution line). The next publish will rewrite it on `main`, and the release merge may conflict on those five files.
- The publish copies each hotspot's `note` and `created_at` into the public files. Check that `note` is meant to be public (the database session).

# 04: The monthly rebuild

Status: ready-for-agent (claimed by the place-search builder; in review)
Type: task
Blocked by: none (01 merged; the owner ticked the setting, 2026-11-06)

## What to build

`.github/workflows/landmarks.yml`: monthly (after openstreetmap.fr's extract of the 1st) and on "Run workflow". Installs `osmium-tool` from apt, runs `scripts/landmarks/build.sh`, and when the file changed, pushes a branch and opens a pull request into `staging` with the counts per kind before and after. Fails loudly (the `alert` job, as in `tiles.yml`) when the download or the check fails. Never commits to `main` or `staging` directly.

The open part: a pull request opened with the workflow's token starts no CI by itself. Recommended: the owner allows Actions to create pull requests, and the workflow then starts CI on its branch with `workflow_dispatch`.

## Acceptance checks

- A dry run on a pull request builds and checks the file but opens nothing.
- A shrink guard: the run fails when the file loses more than 20% of its landmarks, unless "Run workflow" is ticked to allow it.

## Comments

- 2026-11-06: built as `.github/workflows/landmarks.yml`. The build job (read-only) rebuilds and checks the file on staging, compares it kind by kind (`scripts/landmarks/compare.mjs`, refused past a 20% shrink unless "allow shrink" is ticked), and hands a changed file on as an artifact. The pull-request job (the only one that can write, never on a pull request) pushes `landmarks/refresh-<date>-<run>`, opens the pull request into staging with the counts, and starts CI on the branch with `gh workflow run ci.yml`. A failed run opens the `alert` issue (`scripts/watch/report-failed-run.mjs`), and the watch closes it once a run passes. Monthly on the 8th, 19:37 UTC.

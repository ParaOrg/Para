# 04: The monthly rebuild

Status: needs-info
Type: task
Blocked by: 01, and the owner's answer to question 2 in `../README.md`

## What to build

`.github/workflows/landmarks.yml`: monthly (after openstreetmap.fr's extract of the 1st) and on "Run workflow". Installs `osmium-tool` from apt, runs `scripts/landmarks/build.sh`, and when the file changed, pushes a branch and opens a pull request into `staging` with the counts per kind before and after. Fails loudly (the `alert` job, as in `tiles.yml`) when the download or the check fails. Never commits to `main` or `staging` directly.

The open part: a pull request opened with the workflow's token starts no CI by itself. Recommended: the owner allows Actions to create pull requests, and the workflow then starts CI on its branch with `workflow_dispatch`.

## Acceptance checks

- A dry run on a pull request builds and checks the file but opens nothing.
- A shrink guard: the run fails when the file loses more than 20% of its landmarks, unless "Run workflow" is ticked to allow it.

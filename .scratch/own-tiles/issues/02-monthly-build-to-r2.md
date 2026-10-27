# 02: The monthly build and upload to R2

Status: needs-info (owner: an R2 bucket for tiles and a scoped token, as GitHub secrets)
Type: task
Who: Sonnet
Blocked by: 01

## What to build

A GitHub Actions workflow that, monthly and by hand:

1. builds the PMTiles file exactly as 01 settled (area, zooms, Planetiler version pinned);
2. checks it: size within 01's budget, the build date written into the file's metadata, a few known tiles present;
3. uploads it to R2 under a versioned name (`parapo-YYYY-MM-DD.pmtiles`) and moves a small `current.json` pointer to it; keeps the last three;
4. fails loudly: the run is red, and the owner is told the way `backup.yml` tells (read it first).

Also uploads the styles, sprites and glyphs 01 listed, rewritten to point at our tiles host (03 sets its name).

## Files it owns

`.github/workflows/tiles.yml`, `scripts/tiles/` (build and check scripts), the README lines.

## Acceptance checks

- One manual run green, with the file and `current.json` in R2.
- A forced failure (a bad box) turns the run red.

## Comments

### Build (Sonnet), 2026-10-27

Workflow `.github/workflows/tiles.yml`, scripts in `scripts/tiles/`, README section "Map tiles". Area, checks, upload layout and secrets as the hub decided. Choices the brief left open:
- **Build date in the metadata:** Planetiler's own `planetiler:buildtime` is the jar's build time, so the build passes `--archive_version=<date>` and `check.mjs` requires the metadata `version` to equal it.
- **Upload trigger:** the schedule, or "Run workflow" with the `upload` box ticked, on any branch. A pull request never uploads or touches the secrets.
- **Failure alert:** as `backup.yml`: a red run with `::error::` lines; GitHub emails the owner on a failed scheduled run. No issue, no artifact.
- **Cache:** `actions/cache` on Planetiler's `data/sources`. GitHub evicts a cache unused for 7 days, so a monthly run mostly starts cold; a copy in R2 would close that.
- The PMTiles reader is copied to `scripts/tiles/pmtiles.mjs` (the spike's workflow still imports its own).
- Fiord's licence (`openmaptiles/fiord-color-gl-style`): BSD-3-Clause code, CC BY 4.0 design; noted in the README.


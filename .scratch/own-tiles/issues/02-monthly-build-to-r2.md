# 02: The monthly build and upload to R2

Status: resolved (first upload 2026-10-27, run 40483304976; the second, run 40569425946, passed the tile-count comparison)
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
- **Upload trigger (hub):** only from `staging` or `main`. A push to `staging` that changes the workflow or `scripts/tiles/` uploads (schedule and "Run workflow" only work once the file is on `main`); the schedule and "Run workflow" with `upload` ticked stay for then. Any other ref, or a missing secret, stops the run at its first step. A pull request never uploads or sees the secrets.
- **Failure alert:** as `backup.yml`: a red run with `::error::` lines; GitHub emails the owner on a failed scheduled run. No issue, no artifact.
- **Cache (hub):** Planetiler's downloads are copied to `build-cache/sources/` in R2 (`sources.sh`: pull, upstream for what is missing, push). `actions/cache` stays for pull requests.
- The PMTiles reader is copied to `scripts/tiles/pmtiles.mjs` (the spike's workflow still imports its own).
- Fiord's licence (`openmaptiles/fiord-color-gl-style`): BSD-3-Clause code, CC BY 4.0 design; noted in the README.
- **File names (hub):** `parapo-YYYY-MM-DD-<run id>.pmtiles`, unique per run; the upload refuses a key that exists, and deletes old builds only after `current.json` has moved.
- **Secrets (hub):** in a GitHub Environment `tiles` limited to `staging` and `main`; only the R2 steps carry them. Pruning protects the new file and the one the previous `current.json` names.

### First real upload, 2026-10-27

Tiles run 40483304976 (attempt 2), on `staging` 936ffa6, after #417 merged and the owner replaced the R2 keys with ones from the Para account.
- `tiles/current.json` points at `parapo-2026-10-27-40483304976.pmtiles`: 65,831,334 bytes, 2,568 tiles, built 2026-10-27T10:14:23Z, extract 2026-10-27, Planetiler 0.10.2.
- 775 asset files synced under `assets/`. The build-cache copy of Planetiler's downloads was pushed (3 files, 1.4 GB). It counts toward R2 storage and is still well inside the free 10 GB.
- Warnings, none blocking: the tile-count check was skipped (no previous build, as designed); Planetiler's data-fix counts (for example `render_snap_fix_input` 4,522); `actions/cache@v4` runs on Node 20, which GitHub is deprecating.
- Not yet seen on a real run: the tile-count comparison against a previous build, pruning, and the forced-failure (bad box) check.

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

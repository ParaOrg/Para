# 01: The landmark file

Status: ready-for-agent (claimed by the place-search builder; in review)
Type: task
Blocked by: none

## What to build

Step 2's data, no UI. A script that builds `public/data/landmarks.v1.json` from OpenStreetMap at build time, the first generated file, and a unit check on its shape and size.

- `scripts/landmarks/build.sh`: download openstreetmap.fr's Metro Manila extract, check its MD5, filter with `osmium tags-filter`, export with `osmium export`, then run the two Node steps below.
- `scripts/landmarks/landmarks.mjs`: the pure rules (kind from tags, aliases from the other name tags, an area's centroid, a street's stretches, repeats kept once, clip to the panning box from `scripts/tiles/area.mjs`) and the CLI that writes the file.
- `scripts/landmarks/landmark-file.mjs`: the file's text and `landmarkFileProblems`, shared by the build's check and the unit check.
- `scripts/landmarks/check.mjs`: fails the build on any problem.

## Files it owns

- `scripts/landmarks/`
- `public/data/landmarks.v1.json`
- `tests/unit/landmark-file-test.mjs`
- `.scratch/place-search/`

## Acceptance checks

- The file is at most 3 MB, has every kind the owner listed and nothing else, and carries `license: ODbL-1.0` and `attribution: © OpenStreetMap contributors`.
- Running the build twice on one extract gives the same bytes.
- `tests/unit/landmark-file-test.mjs` passes; `npm run check` passes.
- No file under `src/` changes, so the public page's size cannot move.

# 01: The footbridge file

Status: resolved (the owner's answers 1, 3, 7 and 8 as recommended)
Type: task

## What to build

- `public/data/footbridges.v1.json`, built from the same Metro Manila extract as `landmarks.v1.json`, in the same run of `scripts/landmarks/build.sh` (or a sibling script it calls), so the monthly workflow (`landmarks.yml`) opens one pull request with both files.
- **Header.** As the landmark file's: `license` (`ODbL-1.0`), `attribution`, `license_note`, `source`, `extract_at`.
- **Each footbridge.**
  - The OpenStreetMap way id.
  - Its line, 6 decimals.
  - Its name, if it has one.
  - `covered`.
  - Its access points: elevators and steps within a few metres of its ends or on it, each a point and a kind.
  - Which bridges are kept follows the owner's answer to question 1: only those over a road or rail line (recommended), or every footway on a bridge.
- **Filter.** `osmium tags-filter` on `w/bridge`, `w/highway=footway`, `n/highway=elevator,steps`; the major roads and rail for the "over a road" test; a pure Node script makes the file, as `landmarks.mjs` does.
- **Checker and comparison.** A checker (as `scripts/landmarks/check.mjs`): the header, every line inside the map's box, the size under its ceiling. The monthly comparison table (`compare.mjs`) adds the footbridge count and refuses a shrink of more than 20% without `ALLOW_SHRINK=1`.
- **Offline.** The offline worker keeps it (`footbridges`, stale-while-revalidate), as it keeps `landmarks`.

## Acceptance checks

- Unit checks: the "over a road or rail" test on made-up lines (crossing, touching, parallel); access points matched to their footbridge; the file's schema; its size under 500 kB.
- The first build's counts reported against `../README.md`'s table and the owner's 874 lines and 99 points.
- `npm run check`; CI green; merged into staging.

## Answer

Built:
- `scripts/footbridges/` makes the file: `footbridges.mjs` the rules, `footbridge-file.mjs` its shape and checker, `check.mjs`, `compare.mjs`.
- `scripts/landmarks/build.sh` builds it from the same download.
- `landmarks.yml` compares, carries and commits both files in one pull request.
- The offline worker keeps it (`footbridges`).

The first file: 413 footbridges, 60 named, 33 with an elevator; 66 kB, 17.6 kB gzipped. Unit checks: `tests/unit/footbridges-test.mjs` and `tests/unit/footbridge-file-test.mjs`.

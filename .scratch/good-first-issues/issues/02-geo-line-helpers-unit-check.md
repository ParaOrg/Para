# 02: Unit checks for `metresAlong`, `simplifyLine` and `overviewOf`

Status: resolved (#523)
Type: task
Size: small
Blocked by: none

## What is missing

`src/shared/utils/geo.ts` exports `metresAlong`, `simplifyLine` and `overviewOf`, and no file in `tests/unit/` names any of them (checked by searching the folder). Other helpers in the same file are covered in `tests/unit/geo-test.mjs`.

## What to do

Add tests to `tests/unit/geo-test.mjs`, in the style of the tests already there. Use short lines with a few points. Ideas:

- `metresAlong`: a line with fewer than 2 points gives `0`; a point on the line's start gives about `0`; a point on the end gives about the line's whole `lineLength`.
- `simplifyLine`: a straight line of 5 points keeps only its first and last; a line with a clear corner keeps the corner; the first and last points always stay; a line of 2 points comes back as a copy, not the same array.
- `overviewOf`: points come back rounded to 5 decimals.

## Done looks like

- the new tests pass with `npm run test:unit`
- `npm run check` passes
- no change to `geo.ts`

## Where to look

`src/shared/utils/geo.ts`, `tests/unit/geo-test.mjs`.

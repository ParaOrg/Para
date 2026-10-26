# 03: Unit checks for the box helpers in `geo.ts`

Status: ready-for-human
Type: task
Size: small
Blocked by: none

## What is missing

`bboxContains` and `bboxMeetsSegment` in `src/shared/utils/geo.ts` have no unit check (no file in `tests/unit/` names them). `bboxOf` and `bboxesOverlap` do.

## What to do

Add tests to `tests/unit/geo-test.mjs`:

- `bboxContains`: a point inside, a point on the edge (the code counts the edge as inside), a point outside on each of the four sides.
- `bboxMeetsSegment`: a segment inside the box; one crossing it; one that ends outside on both sides but passes through; one entirely outside.

A box is `[west, south, east, north]` and a point is `[longitude, latitude]`. Use simple numbers such as `[0, 0, 10, 10]`.

Careful: `bboxMeetsSegment` only compares the segment's own box with the box. A diagonal that misses the box's corner but whose box overlaps it still counts as meeting. Write a test that documents this, with a comment saying why.

## Done looks like

- the new tests pass with `npm run test:unit`
- `npm run check` passes
- no change to `geo.ts`

## Where to look

`src/shared/utils/geo.ts` (near the bottom), `tests/unit/geo-test.mjs`.

// The rows a direction save writes (src/features/studio/data/direction-rows.ts):
// pure, so no database is needed.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/direction-rows-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { directionRows } from '../../src/features/studio/data/direction-rows.ts';

const input = {
  reversed: false,
  controlPoints: [
    [121.0400000000001, 14.7000000000004],
    [121.0500000000002, 14.7],
  ],
  segments: [
    {
      mode: 'freehand',
      coordinates: [
        [121.0400000000001, 14.7000000000004],
        [121.0500000000002, 14.7],
      ],
    },
  ],
  borrowedFrom: null,
  borrowedPart: 'start',
  borrowedMetres: 120,
};

test('points and segments are rounded to six decimals, and the shape is joined from the rounded segments', () => {
  const { drawn, shape } = directionRows(input, 'r1');
  assert.deepEqual(drawn.control_points, [
    [121.04, 14.7],
    [121.05, 14.7],
  ]);
  assert.deepEqual(drawn.segments[0].coordinates, [
    [121.04, 14.7],
    [121.05, 14.7],
  ]);
  assert.deepEqual(shape.coordinates, drawn.segments[0].coordinates);
  assert.equal(drawn.shape, shape);
  assert.equal(drawn.route_id, 'r1');
});

test('the overview is a line only above one point', () => {
  const line = directionRows(input, 'r1').drawn.overview;
  assert.equal(line?.type, 'LineString');
  assert.ok(line.coordinates.length >= 2);
  const lone = directionRows(
    {
      ...input,
      controlPoints: [[121.04, 14.7]],
      segments: [{ mode: 'freehand', coordinates: [[121.04, 14.7]] }],
    },
    'r1',
  );
  assert.equal(lone.shape.coordinates.length, 1);
  assert.equal(lone.drawn.overview, null);
});

test('the borrow columns are null unless the line borrowed from another', () => {
  const none = directionRows(input, 'r1').drawn;
  assert.equal(none.borrowed_from, null);
  assert.equal(none.borrowed_part, null);
  assert.equal(none.borrowed_m, null);
  const some = directionRows({ ...input, borrowedFrom: 'v9' }, 'r1').drawn;
  assert.equal(some.borrowed_from, 'v9');
  assert.equal(some.borrowed_part, 'start');
  assert.equal(some.borrowed_m, 120);
});

test('the slot is the other way round, empty, with every key spelled out', () => {
  const { drawn, slot } = directionRows({ ...input, reversed: true }, 'r1');
  assert.equal(drawn.reversed, true);
  assert.equal(slot.reversed, false);
  assert.equal(slot.route_id, 'r1');
  assert.deepEqual(slot.control_points, []);
  assert.deepEqual(slot.segments, []);
  assert.deepEqual(Object.keys(slot).sort(), Object.keys(drawn).sort());
  for (const key of ['shape', 'overview', 'borrowed_from', 'borrowed_part', 'borrowed_m']) {
    assert.equal(slot[key], null);
  }
});

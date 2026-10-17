// Whether the commuter's place may choose a loop's tip (src/features/routes/model/loop-tip.ts):
// a sharp fix within reach of the loop does; a vague one, or one far away, leaves the first place.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/loop-tip-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  NEAR_MAX_ACCURACY_M,
  NEAR_MAX_DISTANCE_M,
  usableNear,
} from '../../src/features/routes/model/loop-tip.ts';

const M_PER_DEG_LAT = 111_000;
/** A box `north` metres north of the UP Diliman Oblation. */
const box = (north) => ({
  id: `b${north}`,
  point: { type: 'Point', coordinates: [121.0735, 14.6542 + north / M_PER_DEG_LAT] },
});
const along = [box(0), box(300), box(600)];
const at = (north) => [121.0735, 14.6542 + north / M_PER_DEG_LAT];

test('a sharp fix beside the loop chooses the tip', () => {
  assert.deepEqual(usableNear(along, { at: at(310), accuracyM: 15 }), at(310));
});

test('a fix vaguer than the limit chooses nothing', () => {
  assert.equal(usableNear(along, { at: at(310), accuracyM: NEAR_MAX_ACCURACY_M + 1 }), null);
  assert.deepEqual(
    usableNear(along, { at: at(310), accuracyM: NEAR_MAX_ACCURACY_M }),
    at(310),
    'exactly the limit still counts',
  );
});

test('a commuter farther than the limit from every box of the loop chooses nothing', () => {
  assert.equal(usableNear(along, { at: at(600 + NEAR_MAX_DISTANCE_M + 50), accuracyM: 10 }), null);
  assert.deepEqual(usableNear(along, { at: at(600 + 900), accuracyM: 10 }), at(1500));
});

test('no fix, no choice', () => {
  assert.equal(usableNear(along, null), null);
  assert.equal(usableNear([], { at: at(0), accuracyM: 5 }), null);
});

// ------------------------------------------------------------ the tip on a ride
import { tipOnRide } from '../../src/features/routes/model/loop-tip.ts';

const WHOLE = 3000;

test('with no start the ride leaves from the tip', () => {
  assert.equal(tipOnRide(WHOLE, 500, null, 1200), 'start');
});

test('a start with no end of its own rides round to the tip: the tip is the end', () => {
  assert.equal(tipOnRide(WHOLE, 500, 2000, null), 'end');
});

test('a ride that wraps across the seam and on past the tip passes through it', () => {
  assert.equal(tipOnRide(WHOLE, 500, 2000, 800), 'through');
});

test('a ride that wraps across the seam and stops short of the tip leaves it outside', () => {
  assert.equal(tipOnRide(WHOLE, 500, 2000, 300), 'outside');
});

test('a ride that stays between the start and the tip leaves the tip outside it', () => {
  assert.equal(tipOnRide(WHOLE, 2900, 1000, 1500), 'outside');
});

test('an end picked on the tip is where the ride ends', () => {
  assert.equal(tipOnRide(WHOLE, 500, 2000, 500), 'end');
});

test('a start on the tip is where the ride leaves', () => {
  assert.equal(tipOnRide(WHOLE, 500, 500, 1200), 'start');
});

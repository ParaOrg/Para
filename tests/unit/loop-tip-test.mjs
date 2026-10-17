// Whether the commuter's place may choose a loop's tip (src/features/routes/map/loop-tip.ts):
// a sharp fix within reach of the loop does; a vague one, or one far away, leaves the first place.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/loop-tip-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  NEAR_MAX_ACCURACY_M,
  NEAR_MAX_DISTANCE_M,
  usableNear,
} from '../../src/features/routes/map/loop-tip.ts';

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

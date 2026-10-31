// The Account page's Commute Statistics figures (src/features/contribute/account/commute-figures.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/commute-figures-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  modeSplit,
  recordingsLabel,
  totalDistanceFigure,
  totalTimeFigure,
} from '../../src/features/contribute/account/commute-figures.ts';

test('total time is whole minutes under an hour, then whole hours', () => {
  assert.deepEqual(totalTimeFigure(0), { value: '0', unit: 'min' });
  assert.deepEqual(totalTimeFigure(59 * 60 + 59), { value: '59', unit: 'min' });
  assert.deepEqual(totalTimeFigure(3600), { value: '1', unit: 'hr' });
  assert.deepEqual(totalTimeFigure(62 * 3600 + 3599), { value: '62', unit: 'hr' });
  assert.deepEqual(totalTimeFigure(1240 * 3600), { value: '1,240', unit: 'hr' });
});

test('total distance is whole kilometres with thousands separators', () => {
  assert.deepEqual(totalDistanceFigure(0), { value: '0', unit: 'km' });
  assert.deepEqual(totalDistanceFigure(421_900), { value: '421', unit: 'km' });
  assert.deepEqual(totalDistanceFigure(1_240_000), { value: '1,240', unit: 'km' });
});

test('one Recording, any other number Recordings', () => {
  assert.equal(recordingsLabel(0), 'Recordings');
  assert.equal(recordingsLabel(1), 'Recording');
  assert.equal(recordingsLabel(6), 'Recordings');
});

test('Sakay and Lakad by distance, whole percents adding to 100', () => {
  assert.deepEqual(modeSplit(10_000, 4_000), { sakayPercent: 60, lakadPercent: 40 });
  assert.deepEqual(modeSplit(3, 1), { sakayPercent: 67, lakadPercent: 33 });
  assert.deepEqual(modeSplit(10_000, 0), { sakayPercent: 100, lakadPercent: 0 });
  assert.deepEqual(modeSplit(10_000, 10_000), { sakayPercent: 0, lakadPercent: 100 });
});

test('rides from before the split count as Sakay: all that is not walked', () => {
  // 10 km, of which 2 km walked, 3 km ridden and 5 km saved before the split.
  assert.deepEqual(modeSplit(10_000, 2_000), { sakayPercent: 80, lakadPercent: 20 });
});

test('no distance has no split, for an empty bar', () => {
  assert.equal(modeSplit(0, 0), null);
});

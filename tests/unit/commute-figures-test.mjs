// The Account page's Commute Statistics figures (src/features/contribute/account/commute-figures.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/commute-figures-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  modeSplit,
  routeRecordingsLabel,
  totalDistanceFigure,
  totalFareFigure,
  totalTimeFigure,
  vehicleRidesFigure,
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

test('one Route recorded, any other number Routes recorded', () => {
  assert.equal(routeRecordingsLabel(0), 'Routes recorded');
  assert.equal(routeRecordingsLabel(1), 'Route recorded');
  assert.equal(routeRecordingsLabel(6), 'Routes recorded');
});

test('the total fare: -- with no ride saying its fare, never ₱0', () => {
  assert.deepEqual(totalFareFigure(0, 0), { shown: '--', spoken: 'none' });
  assert.deepEqual(totalFareFigure(129, 0), { shown: '--', spoken: 'none' });
});

test('the total fare in pesos, centavos only when there are some, said in pesos', () => {
  assert.deepEqual(totalFareFigure(129, 4), { shown: '₱129', spoken: '129 pesos' });
  assert.deepEqual(totalFareFigure(0, 2), { shown: '₱0', spoken: '0 pesos' });
  assert.deepEqual(totalFareFigure(1240, 31), { shown: '₱1,240', spoken: '1,240 pesos' });
  assert.deepEqual(totalFareFigure(1240.5, 31), { shown: '₱1,240.50', spoken: '1,240.50 pesos' });
  // A sum's float noise is not centavos.
  assert.deepEqual(totalFareFigure(0.1 + 0.2 + 12.7, 3), { shown: '₱13', spoken: '13 pesos' });
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

test("a vehicle's rides read -- for none, else with separators", () => {
  assert.equal(vehicleRidesFigure(0), '--');
  assert.equal(vehicleRidesFigure(5), '5');
  assert.equal(vehicleRidesFigure(1240), '1,240');
});

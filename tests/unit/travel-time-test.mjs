// Para's own travel-time estimate (estimateTravel, src/features/routes/model/travel-time.ts): a
// ride's length over its mode's speed range plus a dwell per stop, rounded out to whole steps,
// from the numbers in travel-speeds.ts.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/travel-time-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DWELL_MINUTES_PER_STOP,
  ESTIMATE_STEP_MINUTES,
  TRAVEL_SPEED_KMH,
} from '../../src/features/routes/model/travel-speeds.ts';
import {
  estimateTravel,
  travelLabel,
  travelSpoken,
} from '../../src/features/routes/model/travel-time.ts';
import { VEHICLES } from '../../src/features/routes/model/vehicles.ts';

const STEP = ESTIMATE_STEP_MINUTES;

test('every mode has a speed range, slow under fast, and a dwell', () => {
  for (const vehicle of VEHICLES) {
    const { slow, fast } = TRAVEL_SPEED_KMH[vehicle];
    assert.ok(slow > 0 && slow < fast, `${vehicle}: ${slow}–${fast} km/h`);
    assert.ok(DWELL_MINUTES_PER_STOP[vehicle] >= 0, vehicle);
  }
});

test('each mode gives a range, low under high, both whole steps', () => {
  for (const vehicle of VEHICLES) {
    const { low, high } = estimateTravel(vehicle, 12_000, 10);
    assert.ok(low < high, `${vehicle}: ${low}–${high}`);
    assert.equal(low % STEP, 0, `${vehicle} low ${low}`);
    assert.equal(high % STEP, 0, `${vehicle} high ${high}`);
  }
});

test('the figure the owner drew: an 11.3 km jeep ride with 11 stops is ~30–65 min', () => {
  assert.equal(travelLabel(estimateTravel('Jeepney', 11_300, 11)), '~30–65 min');
});

test('a short ride is never under one step, nor a single number', () => {
  const { low, high } = estimateTravel('Jeepney', 300, 0);
  assert.equal(low, STEP);
  assert.equal(high, 2 * STEP);
});

test('a long ride takes longer than a short one, at both ends', () => {
  const short = estimateTravel('Bus', 5_000, 4);
  const long = estimateTravel('Bus', 30_000, 4);
  assert.ok(long.low > short.low && long.high > short.high);
});

test('more stops add their dwell to both ends', () => {
  const few = estimateTravel('Jeepney', 10_000, 2);
  const many = estimateTravel('Jeepney', 10_000, 40);
  const added = 38 * DWELL_MINUTES_PER_STOP.Jeepney;
  assert.ok(many.low - few.low >= added - STEP && many.low > few.low);
  assert.ok(many.high - few.high >= added - STEP && many.high > few.high);
});

test('the range is rounded out: the low down, the high up, to whole steps', () => {
  // 10 km by jeep, no stops: 24 min at 25 km/h, 50 min at 12 km/h.
  const { low, high } = estimateTravel('Jeepney', 10_000, 0);
  assert.equal(low, 20);
  assert.equal(high, 50);
});

test('a train runs faster than a jeep over the same ride', () => {
  const train = estimateTravel('LRT-1', 15_000, 10);
  const jeep = estimateTravel('Jeepney', 15_000, 10);
  assert.ok(train.high < jeep.high);
});

test('the pill writes "~30–60 min", and a screen reader hears it is an estimate', () => {
  assert.equal(travelLabel({ low: 30, high: 60 }), '~30–60 min');
  assert.equal(travelSpoken({ low: 30, high: 60 }), 'About 30 to 60 minutes, an estimate');
});

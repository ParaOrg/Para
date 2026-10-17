// The page's one door to the leg, auto-stop and bearing rules
// (src/features/contribute/ride-rules.ts), held to what the page relies on, so
// swapping in the rules of ride-recording.ts changes nothing it can see.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/contribute-rules-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  courseBearing,
  legAfter,
  legsOf,
  shouldAutoStop,
} from '../../src/features/contribute/ride-rules.ts';
import {
  countdownText,
  kilometresText,
  minutesText,
} from '../../src/features/contribute/format.ts';

const T0 = Date.UTC(2026, 9, 17, 6, 0, 0);
const M_PER_DEG_LNG = 107_600;
/** A fix `s` seconds in, `east` metres east of Tala. */
const fix = (s, east) => ({
  time: T0 + s * 1000,
  at: [121.0 + east / M_PER_DEG_LNG, 14.6],
  accuracyM: 5,
});

test('the first leg is papunta and every switch flips it', () => {
  assert.deepEqual([0, 1, 2, 3].map(legAfter), ['papunta', 'pabalik', 'papunta', 'pabalik']);
});

test('legs are cut at each switch and joined where it was', () => {
  const fixes = [fix(0, 0), fix(10, 100), fix(20, 200), fix(30, 100), fix(40, 0)];
  const legs = legsOf(fixes, [{ time: T0 + 20_000, at: fixes[2].at }]);
  assert.deepEqual(
    legs.map((l) => l.name),
    ['papunta', 'pabalik'],
  );
  assert.deepEqual(legs[0].path.at(-1), legs[1].path[0]);
  assert.equal(legs[0].path.length, 3);
  assert.equal(legs[1].path.length, 3);
});

test('with no switch the whole ride is papunta', () => {
  const legs = legsOf([fix(0, 0), fix(10, 100)], []);
  assert.deepEqual(
    legs.map((l) => l.name),
    ['papunta'],
  );
});

test('the ride stops itself only after a kilometre, a Pabalik tap, and a return within 300 m', () => {
  const start = fix(0, 0).at;
  const base = { start, here: fix(1, 250).at, rideDistanceM: 2400, switchCount: 1 };
  assert.equal(shouldAutoStop(base), true);
  assert.equal(shouldAutoStop({ ...base, rideDistanceM: 900 }), false, 'not a kilometre yet');
  assert.equal(shouldAutoStop({ ...base, switchCount: 0 }), false, 'no Pabalik tap');
  assert.equal(shouldAutoStop({ ...base, here: fix(1, 400).at }), false, 'still 400 m away');
  assert.equal(shouldAutoStop({ ...base, start: null }), false, 'no start yet');
});

test('the bearing is the direction of travel, and null while standing still', () => {
  const east = [fix(0, 0), fix(10, 30)];
  assert.ok(Math.abs(courseBearing(east) - 90) < 0.5);
  const west = [fix(0, 30), fix(10, 0)];
  assert.ok(Math.abs(courseBearing(west) - 270) < 0.5);
  assert.equal(courseBearing([fix(0, 0), fix(10, 2)]), null);
  assert.equal(courseBearing([]), null);
});

test('the stats strip and the countdown say their figures the way the design reads them', () => {
  assert.equal(minutesText(42 * 60 + 59), '42');
  assert.equal(kilometresText(4200), '4.2');
  assert.equal(kilometresText(4249), '4.2');
  assert.equal(countdownText(102), '1:42');
  assert.equal(countdownText(120), '2:00');
  assert.equal(countdownText(0.2), '0:01');
  assert.equal(countdownText(-3), '0:00');
});

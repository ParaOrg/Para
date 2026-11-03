// The studio's contribution marks: the `mark` events read out of an upload's
// events array, where each lands on the ride by its time, and the pins the
// opened upload's map layer is handed.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/contribution-marks-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { marksOf } from '../../src/features/studio/data/contribution-events.ts';
import { placeMark } from '../../src/features/studio/contributors/mark-placement.ts';
import { openedData } from '../../src/features/studio/contributors/opened-data.ts';

import { T0 } from './fixtures/contribution-ride.mjs';

const iso = (ms) => new Date(ms).toISOString();
const fix = (s, lng, lat) => ({ time: T0 + s * 1000, at: [lng, lat] });
const trail = [
  fix(0, 121.0, 14.0),
  fix(10, 121.1, 14.2),
  fix(20, 121.2, 14.2),
  fix(120, 121.3, 14.4),
];

test('marks are read oldest first, and other kinds and bad rows are ignored', () => {
  const events = [
    { kind: 'mark', at: iso(T0 + 20_000) },
    { kind: 'switch', at: iso(T0 + 5_000), to: 'return' },
    { kind: 'mark', at: iso(T0 + 8_000) },
    { kind: 'mark', at: 'not a time' },
    { kind: 'mark' },
    { kind: 'something-new', at: iso(T0), extra: 1 },
    'junk',
    null,
  ];
  assert.deepEqual(marksOf(events), [T0 + 8_000, T0 + 20_000]);
  assert.deepEqual(marksOf([]), []);
  assert.deepEqual(marksOf(null), []);
  assert.deepEqual(marksOf({ kind: 'mark' }), []);
});

test("a mark at a fix's exact time sits on that fix", () => {
  assert.deepEqual(placeMark(trail, T0 + 10_000), [121.1, 14.2]);
});

test('a mark between two close fixes is interpolated by time', () => {
  const at = placeMark(trail, T0 + 5_000);
  assert.ok(Math.abs(at[0] - 121.05) < 1e-9 && Math.abs(at[1] - 14.1) < 1e-9);
});

test('a mark before the first or after the last fix is clamped to it', () => {
  assert.deepEqual(placeMark(trail, T0 - 60_000), [121.0, 14.0]);
  assert.deepEqual(placeMark(trail, T0 + 999_000), [121.3, 14.4]);
});

test('a mark inside a gap goes to the nearer fix, not along a straight line', () => {
  assert.deepEqual(placeMark(trail, T0 + 40_000), [121.2, 14.2]);
  assert.deepEqual(placeMark(trail, T0 + 100_000), [121.3, 14.4]);
});

test('a ride with no fixes places nothing', () => {
  assert.equal(placeMark([], T0), null);
});

test('the opened upload gets one pin per mark, and none when it has none', () => {
  const detail = { trail, hintos: [], marks: [T0 + 5_000, T0 + 20_000], parts: [] };
  const pins = openedData(detail).features.filter((f) => f.properties.kind === 'mark');
  assert.equal(pins.length, 2);
  assert.deepEqual(pins[1].geometry.coordinates, [121.2, 14.2]);
  const none = openedData({ ...detail, marks: [] }).features.filter(
    (f) => f.properties.kind === 'mark',
  );
  assert.equal(none.length, 0);
});

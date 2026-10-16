// Which of a lit ride's ends wear their S and E on the map
// (src/features/routes/map/direction-arrows.ts, rideEnds; EndTitles draws them):
// every end, but one on the pale past a pick, and both of a trip whose start
// is picked with no ride drawn (the owner, 2026-10-16: "Nothing yet, just the S").
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-ends-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { rideEnds } from '../../src/features/routes/map/direction-arrows.ts';

const line = [
  [121.0, 14.7],
  [121.01, 14.7],
  [121.02, 14.7],
  [121.03, 14.7],
];
const trip = { id: 'v', line, from: 'Tala', to: 'Novaliches' };
const marks = (rides) => rideEnds(rides).map((e) => [e.end, e.isMarked]);

test('a lit ride with nothing picked: both ends marked, Start’s S and End’s E', () => {
  assert.deepEqual(marks([trip]), [
    ['from', true],
    ['to', true],
  ]);
});

test('a ride from a start to an end: the ends on the pale are left unmarked, the picks’ pins carrying them', () => {
  const pale = [line.slice(0, 2), line.slice(2)];
  assert.deepEqual(marks([{ ...trip, pale }]), [
    ['from', false],
    ['to', false],
  ]);
  assert.deepEqual(
    rideEnds([{ ...trip, pale }]).map((e) => e.paled),
    [true, true],
  );
});

test('a start alone: both ends unmarked and lit, the start’s pin the one S', () => {
  const ends = rideEnds([{ ...trip, isUnmarked: true }]);
  assert.deepEqual(
    ends.map((e) => [e.end, e.isMarked, e.paled]),
    [
      ['from', false, false],
      ['to', false, false],
    ],
  );
});

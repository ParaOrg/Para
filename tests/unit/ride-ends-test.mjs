// Which of a lit ride's ends wear their S and E on the map
// (src/features/routes/map/direction-arrows.ts, rideEnds; EndTitles draws them):
// every end, but one on the pale past a pick, and both of a trip whose start
// is picked with no ride drawn (the owner, 2026-10-16: "Nothing yet, just the S");
// and which way its chevrons flow (flowLines).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-ends-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { flowLines, rideEnds } from '../../src/features/routes/map/direction-arrows.ts';

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
  assert.deepEqual(
    rideEnds([trip]).map((e) => e.mark),
    ['start', 'end'],
  );
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

// The owner, 2026-10-16: "Nothing yet, just the S", and that night, "the
// rouline would be in pale": useLitRides gives the whole line as its pale.
test('a start alone: both ends unmarked and on the pale with the whole line, the start’s pin the one S', () => {
  const ends = rideEnds([{ ...trip, isUnmarked: true, pale: [line] }]);
  assert.deepEqual(
    ends.map((e) => [e.end, e.isMarked, e.paled]),
    [
      ['from', false, true],
      ['to', false, true],
    ],
  );
});

// The owner, 2026-10-16: "the arrow in route line change the flow to
// accompany or in accordance with start and endpoint selected".
test('the chevrons flow along the line, and back along it for a ride picked backwards, its ends still where they were', () => {
  const pale = [line.slice(0, 2), line.slice(2)];
  const [ahead, back] = flowLines([
    { ...trip, pale },
    { ...trip, pale, isBackwards: true },
  ]);
  assert.equal(ahead, line, 'the line itself, in travel order');
  assert.deepEqual(back, [...line].reverse(), 'from the S, after the E, back to it');
  assert.deepEqual(line[0], [121.0, 14.7], 'the line handed in is left as it was');
  // The origin picked with the start kept (the owner, 2026-10-16: "keep the
  // start"): the ride back to it, which wears the E there.
  const toOrigin = rideEnds([{ ...trip, pale: [line.slice(1)], isBackwards: true }]);
  assert.deepEqual(
    toOrigin.map((e) => [e.end, e.isMarked, e.mark]),
    [
      ['from', true, 'end'],
      ['to', false, 'start'],
    ],
  );
  // Its ends on the pale, as a ride the trip's way has them: the picks' pins carry the S and E.
  const ends = rideEnds([{ ...trip, pale, isBackwards: true }]);
  assert.deepEqual(
    ends.map((e) => [e.end, e.paled, e.isMarked]),
    [
      ['from', true, false],
      ['to', true, false],
    ],
  );
});

test('a loop lit with no trip open has no end circles; an open one has the one on its tip', async () => {
  const { rideEnds } = await import('../../src/features/routes/map/direction-arrows.ts');
  const ring = [
    [121.07, 14.65],
    [121.08, 14.65],
    [121.08, 14.66],
    [121.07, 14.65],
  ];
  const loop = { id: 'ikot', line: ring, from: 'Oblation', to: 'Oblation' };
  assert.deepEqual(rideEnds([{ ...loop, loopEnd: 'none' }]), []);
  const ends = rideEnds([{ ...loop, loopEnd: 'start', fromHotspot: 'h1', toHotspot: 'h1' }]);
  assert.equal(ends.length, 1, 'one circle: the line comes back to where it left');
  assert.equal(ends[0].end, 'from');
  assert.equal(ends[0].name, 'Oblation');
  assert.equal(ends[0].named, true);
  assert.equal(ends[0].mark, 'start', 'the tip wears the S');
});

test('a loop whose tip is the end of a ride with a start has the E there, and a passed tip is a bare circle', async () => {
  const { rideEnds } = await import('../../src/features/routes/map/direction-arrows.ts');
  const ring = [
    [121.07, 14.65],
    [121.08, 14.65],
    [121.08, 14.66],
    [121.07, 14.65],
  ];
  const loop = {
    id: 'ikot',
    line: ring,
    from: 'Oblation',
    to: 'Oblation',
    fromHotspot: 'h1',
    toHotspot: 'h1',
  };
  const [end] = rideEnds([{ ...loop, loopEnd: 'end' }]);
  assert.equal(rideEnds([{ ...loop, loopEnd: 'end' }]).length, 1);
  assert.equal(end.end, 'to');
  assert.equal(end.mark, 'end', 'the E');
  assert.equal(end.isMarked, true);
  const [bare] = rideEnds([{ ...loop, loopEnd: 'bare' }]);
  assert.equal(bare.named, false, 'no name over it');
  assert.equal(bare.isMarked, false, 'no S or E on it');
  const [start] = rideEnds([{ ...loop, loopEnd: 'start' }]);
  assert.equal(start.mark, 'start');
  assert.equal(start.named, true);
});

// The studio's walk and ride parts: the `mode` events read out of an upload's
// events array (Lakad and Sakay), the trail cut by them, what becomes route
// material (the ride only), and the opened upload's map features.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/contribution-parts-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { partsOf } from '../../src/features/studio/data/contribution-events.ts';
import {
  rideLines,
  TRAIL_MAX_ACCURACY_M,
  modeAt,
  splitTrail,
} from '../../src/features/studio/contributors/trail-parts.ts';
import { MAX_ACCURACY_M } from '../../src/features/routes/model/ride-recording.ts';
import { openedData } from '../../src/features/studio/contributors/opened-data.ts';

import { T0 } from './fixtures/contribution-ride.mjs';

const iso = (ms) => new Date(ms).toISOString();
const s = (seconds) => T0 + seconds * 1000;
const END = s(600);
const mode = (seconds, to) => ({ kind: 'mode', at: iso(s(seconds)), to });

test('an upload with no mode events, every one sent so far, is one ride', () => {
  const ride = [{ mode: 'ride', from: T0, to: END }];
  assert.deepEqual(partsOf([], T0, END), ride);
  assert.deepEqual(partsOf(null, T0, END), ride);
  assert.deepEqual(partsOf({ kind: 'mode' }, T0, END), ride);
  assert.deepEqual(
    partsOf(
      [
        { kind: 'mark', at: iso(s(5)) },
        { kind: 'switch', at: iso(s(9)), to: 'return' },
      ],
      T0,
      END,
    ),
    ride,
  );
});

test('a walk then a ride: each part runs to the next mode event, the last to the end', () => {
  assert.deepEqual(partsOf([mode(0, 'walk'), mode(120, 'ride')], T0, END), [
    { mode: 'walk', from: T0, to: s(120) },
    { mode: 'ride', from: s(120), to: END },
  ]);
});

test('several switches come out in time order, and a repeated mode joins its part', () => {
  const events = [
    mode(400, 'walk'),
    mode(0, 'walk'),
    mode(100, 'ride'),
    mode(250, 'ride'),
    mode(300, 'walk'),
    mode(350, 'ride'),
  ];
  assert.deepEqual(partsOf(events, T0, END), [
    { mode: 'walk', from: T0, to: s(100) },
    { mode: 'ride', from: s(100), to: s(300) },
    { mode: 'walk', from: s(300), to: s(350) },
    { mode: 'ride', from: s(350), to: s(400) },
    { mode: 'walk', from: s(400), to: END },
  ]);
});

test('junk entries are left out, never an error', () => {
  const events = [
    mode(0, 'walk'),
    { kind: 'mode', at: 'not a time', to: 'ride' },
    { kind: 'mode', at: iso(s(60)), to: 'fly' },
    { kind: 'mode', to: 'ride' },
    { kind: 'mode', at: 12, to: 'ride' },
    'mode',
    null,
    mode(200, 'ride'),
  ];
  assert.deepEqual(partsOf(events, T0, END), [
    { mode: 'walk', from: T0, to: s(200) },
    { mode: 'ride', from: s(200), to: END },
  ]);
});

test("an event outside the recording's time: before counts from the start, after is ignored", () => {
  assert.deepEqual(partsOf([mode(-30, 'walk'), mode(-10, 'ride'), mode(700, 'walk')], T0, END), [
    { mode: 'ride', from: T0, to: END },
  ]);
  assert.deepEqual(partsOf([mode(-30, 'ride'), mode(200, 'walk')], T0, END), [
    { mode: 'ride', from: T0, to: s(200) },
    { mode: 'walk', from: s(200), to: END },
  ]);
  // A first event a little after the start reaches back to it.
  assert.deepEqual(partsOf([mode(3, 'walk')], T0, END), [{ mode: 'walk', from: T0, to: END }]);
  // A switch at the very end leaves no empty part.
  assert.deepEqual(partsOf([mode(0, 'walk'), mode(600, 'ride')], T0, END), [
    { mode: 'walk', from: T0, to: END },
  ]);
});

const fix = (seconds, lng, accuracyM = 6) => ({ time: s(seconds), at: [lng, 14.6], accuracyM });
const trail = [0, 60, 120, 180, 240, 300, 360, 420, 480, 540].map((t) => fix(t, 121 + t / 10_000));
const walkRideWalk = [
  { mode: 'walk', from: T0, to: s(120) },
  { mode: 'ride', from: s(120), to: s(420) },
  { mode: 'walk', from: s(420), to: END },
];

test('the trail is cut by its points’ times, each part ending on the next one’s first point', () => {
  const pieces = splitTrail(trail, walkRideWalk);
  assert.deepEqual(
    pieces.map((p) => [p.mode, p.points.map((point) => (point.time - T0) / 1000)]),
    [
      ['walk', [0, 60, 120]],
      ['ride', [120, 180, 240, 300, 360, 420]],
      ['walk', [420, 480, 540]],
    ],
  );
  assert.deepEqual(
    splitTrail(trail, []).map((p) => [p.mode, p.points.length]),
    [['ride', 10]],
  );
});

/** The seconds each point of a line was taken at: the trail's longitude says it. */
const secondsOf = (line) => line?.map(([lng]) => Math.round((lng - 121) * 10_000));

/** The parts of a trail, one a minute from 0 s to 540 s, by mode and start: [mode, seconds]... */
const partsAt = (...cuts) =>
  cuts.map(([mode, from], i) => ({
    mode,
    from: s(from),
    to: i + 1 < cuts.length ? s(cuts[i + 1][1]) : END,
  }));
/** The ride list as [trail part, seconds of each point]. */
const ridesOf = (points, parts) =>
  rideLines(splitTrail(points, parts)).map((ride) => [ride.piece, secondsOf(ride.line)]);

test('the ride list: each usable ride on its own, in time order, with its trail part', () => {
  assert.deepEqual(ridesOf(trail, partsAt(['walk', 0])), [], 'no ride');
  assert.deepEqual(ridesOf(trail, partsAt(['walk', 0], ['ride', 120], ['walk', 420])), [
    [1, [120, 180, 240, 300, 360, 420]],
  ]);
  assert.deepEqual(
    ridesOf(trail, partsAt(['walk', 0], ['ride', 60], ['walk', 240], ['ride', 300])),
    [
      [1, [60, 120, 180, 240]],
      [3, [300, 360, 420, 480, 540]],
    ],
  );
  assert.deepEqual(
    ridesOf(
      trail,
      partsAt(['ride', 0], ['walk', 120], ['ride', 180], ['walk', 300], ['ride', 360]),
    ),
    [
      [0, [0, 60, 120]],
      [2, [180, 240, 300]],
      [4, [360, 420, 480, 540]],
    ],
  );
  const [first, second] = rideLines(
    splitTrail(trail, partsAt(['ride', 0], ['walk', 120], ['ride', 180])),
  );
  assert.ok(
    first.lengthM > 0 && second.lengthM > first.lengthM,
    'each ride carries its own length',
  );
});

test('a ride too short to use, or whose fixes are all vague, is not listed', () => {
  // The ride from 240 s to 250 s holds one fix of its own: with the next part's first, two
  // points, so it stays; one ending before any later fix has one point and goes.
  const short = [...trail.slice(0, 5), fix(250, 121.025), ...trail.slice(5)];
  assert.deepEqual(
    ridesOf(short, partsAt(['ride', 0], ['walk', 120], ['ride', 245], ['walk', 260])).map(
      ([piece]) => piece,
    ),
    [0, 2],
  );
  assert.deepEqual(
    ridesOf(trail.slice(0, 5), partsAt(['walk', 0], ['ride', 230])),
    [],
    'a last ride with one fix',
  );
  const vagueSecond = trail.map((p, i) => (i >= 5 ? { ...p, accuracyM: 80 } : p));
  assert.deepEqual(
    ridesOf(vagueSecond, partsAt(['ride', 0], ['walk', 120], ['ride', 300])).map(
      ([piece]) => piece,
    ),
    [0],
    'the second ride is all vague',
  );
});

test("the studio's vague-fix limit is the recorder's", () => {
  assert.equal(TRAIL_MAX_ACCURACY_M, MAX_ACCURACY_M);
});

test('a fix too vague to place the ride never becomes route material', () => {
  const vague = trail.map((p, i) => (i === 4 ? { ...p, at: [121.03, 14.61], accuracyM: 100 } : p));
  const [ride] = rideLines(splitTrail(vague, walkRideWalk));
  const line = ride.line;
  assert.deepEqual(secondsOf(line), [120, 180, 300, 360, 420]);
  assert.ok(!line.some(([lng, lat]) => lng === 121.03 && lat === 14.61));
  // A ride whose only fixes are vague has no line at all.
  const allVague = trail.map((p) => ({ ...p, accuracyM: 80 }));
  assert.deepEqual(rideLines(splitTrail(allVague, walkRideWalk)), []);
});

test('a hinto takes the mode of the part it began in', () => {
  assert.equal(modeAt(walkRideWalk, s(30)), 'walk');
  assert.equal(modeAt(walkRideWalk, s(120)), 'ride');
  assert.equal(modeAt(walkRideWalk, s(9_999)), 'walk');
  assert.equal(modeAt([], s(30)), 'ride');
});

test('the opened map draws each part as its own line, joined to the next', () => {
  const lines = openedData({ trail, hintos: [], marks: [], parts: walkRideWalk })
    .features.filter((f) => f.properties.kind === 'trail')
    .map((f) => [f.properties.mode, f.geometry.coordinates.length]);
  assert.deepEqual(lines, [
    ['walk', 3],
    ['ride', 6],
    ['walk', 3],
  ]);
  const old = openedData({ trail, hintos: [], marks: [], parts: [] }).features;
  assert.deepEqual(
    old.map((f) => f.properties.mode),
    ['ride'],
    'an upload without mode events draws as one ride, as before',
  );
});

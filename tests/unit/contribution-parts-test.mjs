// The studio's walk and ride parts: the `mode` events read out of an upload's
// events array (Lakad and Sakay), the trail cut by them, what becomes route
// material (the ride only), and the opened upload's map features.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/contribution-parts-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { partsOf } from '../../src/features/studio/data/contribution-events.ts';
import {
  longestRide,
  modeAt,
  splitTrail,
} from '../../src/features/studio/contributors/trail-parts.ts';
import { openedData } from '../../src/features/studio/contributors/opened-data.ts';
import { FOOT_SIZE, footIcon } from '../../src/features/studio/maps/foot-icon.ts';

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

const fix = (seconds, lng) => ({ time: s(seconds), at: [lng, 14.6] });
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

test('route material is the longest ride; all walking has none', () => {
  const twoRides = [
    { mode: 'ride', from: T0, to: s(120) },
    { mode: 'walk', from: s(120), to: s(180) },
    { mode: 'ride', from: s(180), to: END },
  ];
  const ride = longestRide(splitTrail(trail, twoRides));
  assert.deepEqual(
    ride?.points.map((p) => (p.time - T0) / 1000),
    [180, 240, 300, 360, 420, 480, 540],
  );
  assert.deepEqual(
    longestRide(splitTrail(trail, walkRideWalk))?.points.map((p) => (p.time - T0) / 1000),
    [120, 180, 240, 300, 360, 420],
    'a ride between walks runs from where the first walk ended to where the next began',
  );
  assert.equal(longestRide(splitTrail(trail, [{ mode: 'walk', from: T0, to: END }])), null);
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

test("the walk parts' foot is an RGBA bitmap in the line's colour, clear at its corners", () => {
  const { width, height, data } = footIcon('#ca3500');
  assert.equal(width, FOOT_SIZE);
  assert.equal(height, FOOT_SIZE);
  assert.equal(data.length, FOOT_SIZE * FOOT_SIZE * 4);
  assert.equal(data[3], 0, 'the top-left corner is clear');
  const sole = (15 * FOOT_SIZE + 12) * 4;
  assert.deepEqual([...data.slice(sole, sole + 4)], [0xca, 0x35, 0x00, 255]);
});

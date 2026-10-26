// The line drawn on the contributor's map (src/features/routes/model/display-path.ts):
// steadier than the fixes that count, and never different in what is stored.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/display-path-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { trailOf } from '../../src/features/contribute/recording-rules.ts';
import { packRecording } from '../../src/features/contribute/api/pack-recording.ts';
import { displayFixes } from '../../src/features/routes/model/display-path.ts';
import { keptFixes, waysOf } from '../../src/features/routes/model/ride-recording.ts';

import { T0, rideFixes, rideRecording } from './fixtures/contribution-ride.mjs';

const M_PER_DEG = 111_195;
const LAT = 14.6;
/** The page measures on a flat grid around the first fix; the test measures at the origin's latitude, a few millimetres apart. */
const SLACK_M = 0.05;
const M_PER_DEG_LNG = M_PER_DEG * Math.cos((LAT * Math.PI) / 180);
/** A fix `s` seconds in, `east` and `north` metres from the origin. */
const fix = (s, east, north, accuracyM = 5) => ({
  time: T0 + s * 1000,
  at: [121 + east / M_PER_DEG_LNG, LAT + north / M_PER_DEG],
  accuracyM,
});
const eastOf = (f) => (f.at[0] - 121) * M_PER_DEG_LNG;
const northOf = (f) => (f.at[1] - LAT) * M_PER_DEG;
const metres = (a, b) => Math.hypot(eastOf(a) - eastOf(b), northOf(a) - northOf(b));

/** The sharpest change of direction along a path, in degrees (0 straight on, 180 straight back). */
function sharpestTurn(path) {
  let sharpest = 0;
  for (let i = 1; i + 1 < path.length; i++) {
    const [ax, ay] = [
      eastOf(path[i]) - eastOf(path[i - 1]),
      northOf(path[i]) - northOf(path[i - 1]),
    ];
    const [bx, by] = [
      eastOf(path[i + 1]) - eastOf(path[i]),
      northOf(path[i + 1]) - northOf(path[i]),
    ];
    const cos = (ax * bx + ay * by) / (Math.hypot(ax, ay) * Math.hypot(bx, by));
    sharpest = Math.max(sharpest, (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI);
  }
  return sharpest;
}

/** A small deterministic generator, so the noisy rides are the same every run. */
function noise(seed) {
  let state = seed;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) % 4_294_967_296;
    return (state / 4_294_967_296) * 2 - 1;
  };
}

/** 2 minutes north at 8 m/s with `amplitude` metres of sideways and lengthways noise, reporting 25 m. */
function noisyStraightRide(amplitude, isAlternating) {
  const random = noise(7);
  return Array.from({ length: 120 }, (_, s) => {
    const side = isAlternating ? (s % 2 === 0 ? 1 : -1) * amplitude : random() * amplitude;
    return fix(s, side, s * 8 + (isAlternating ? 0 : random() * amplitude), 25);
  });
}

for (const isAlternating of [true, false]) {
  test(`a straight ride with ±20 m ${isAlternating ? 'alternating' : 'random'} noise is drawn with no reversals, within accuracy of the road`, () => {
    const raw = noisyStraightRide(20, isAlternating);
    const drawn = displayFixes(raw);
    assert.ok(sharpestTurn(raw) > 150, 'the fixture is a mess to begin with');
    assert.ok(sharpestTurn(drawn) <= 150, `drawn path still reverses (${sharpestTurn(drawn)}°)`);
    for (const point of drawn) assert.ok(Math.abs(eastOf(point)) <= 25, 'strays past its accuracy');
    assert.ok(Math.abs(northOf(drawn[0])) <= 25 && Math.abs(northOf(drawn.at(-1)) - 119 * 8) <= 25);
  });
}

test('a stop at a corner is one held point, not the wander of the wait', () => {
  const wander = noise(3);
  const ride = [
    ...Array.from({ length: 10 }, (_, s) => fix(s, 0, s * 8)),
    ...Array.from({ length: 40 }, (_, s) => fix(10 + s, wander() * 4, 72 + wander() * 4)),
    ...Array.from({ length: 10 }, (_, s) => fix(50 + s, (s + 1) * 8, 72)),
  ];
  const drawn = displayFixes(ride);
  const waiting = drawn.filter((f) => metres(f, fix(0, 0, 72)) <= 6);
  assert.equal(waiting.length, 1);
  assert.ok(drawn.length < 25);
  assert.equal(drawn[0], ride[0], 'the first fix is not moved');
});

test('a tunnel-like stretch of only 40 m fixes is drawn from them, not as a straight jump', () => {
  const ride = [
    ...Array.from({ length: 10 }, (_, s) => fix(s, 0, s * 8)),
    ...Array.from({ length: 30 }, (_, s) => fix(10 + s, 0, 80 + s * 8, 40)),
    ...Array.from({ length: 10 }, (_, s) => fix(40 + s, 0, 320 + s * 8)),
  ];
  const drawn = displayFixes(ride);
  const inside = drawn.filter((f) => f.accuracyM === 40);
  assert.ok(inside.length >= 25, `only ${inside.length} of the tunnel is drawn`);
  const longest = Math.max(...drawn.slice(1).map((f, i) => metres(f, drawn[i])));
  assert.ok(longest < 30);
  assert.equal(displayFixes(ride.slice(10, 40)).length > 20, true, 'all-vague ride is drawn too');
});

test('a few vague fixes are left out when the line has no long gap without them', () => {
  const ride = Array.from({ length: 30 }, (_, s) =>
    fix(s, s === 15 ? 25 : 0, s * 8, s === 15 ? 45 : 5),
  );
  const drawn = displayFixes(ride);
  assert.ok(!drawn.some((f) => f.accuracyM === 45));
});

test('a real 90° turn at a junction is kept, to within the accuracy', () => {
  const ride = [
    ...Array.from({ length: 12 }, (_, s) => fix(s, 0, s * 8)),
    ...Array.from({ length: 12 }, (_, s) => fix(12 + s, (s + 1) * 8, 88)),
  ];
  const drawn = displayFixes(ride);
  const corner = drawn.reduce((best, f) =>
    metres(f, fix(0, 0, 88)) < metres(best, fix(0, 0, 88)) ? f : best,
  );
  assert.ok(metres(corner, fix(0, 0, 88)) <= 5 + SLACK_M);
  // Rounded over a few fixes, not erased: it still ends up heading east, from north.
  const heading = (a, b) =>
    (Math.atan2(eastOf(b) - eastOf(a), northOf(b) - northOf(a)) * 180) / Math.PI;
  assert.ok(Math.abs(heading(drawn[0], drawn[1])) < 1);
  assert.ok(Math.abs(heading(drawn.at(-2), drawn.at(-1)) - 90) < 1);
  assert.ok(drawn.length >= ride.length - 2, 'no fix of the turn is dropped');
});

test('a fix never moves by more than its own accuracy', () => {
  const raw = noisyStraightRide(20, false);
  const byTime = new Map(raw.map((f) => [f.time, f]));
  for (const point of displayFixes(raw)) {
    assert.ok(metres(point, byTime.get(point.time)) <= point.accuracyM + SLACK_M);
  }
});

test('the way switches keep the fix they were placed on, and the line still breaks there', () => {
  const raw = noisyStraightRide(20, true);
  const switches = [{ time: T0 + 60_500, to: 'return' }];
  const trail = trailOf(raw, switches);
  const before = waysOf(raw, switches);
  assert.deepEqual(
    trail.markers.map((m) => m.at),
    before.markers.map((m) => m.at),
  );
  assert.deepEqual(
    trail.lines.map((l) => l.way),
    ['outbound', 'return'],
  );
  assert.deepEqual(trail.lines[0].path.at(-1), before.markers[0].at);
  assert.deepEqual(trail.lines[1].path[0], before.markers[0].at);
});

test('each mark sits on a drawn vertex of the line', () => {
  const raw = noisyStraightRide(20, false);
  const marks = [{ time: T0 + 20_500 }, { time: T0 + 61_000 }, { time: T0 + 100_000 }];
  const trail = trailOf(raw, [], marks);
  const vertices = trail.lines.flatMap((line) => line.path.map(String));
  assert.equal(trail.marks.length, 3);
  for (const { at } of trail.marks) assert.ok(vertices.includes(String(at)), 'pin off the line');
  assert.deepEqual(
    trail.marks.map((m) => m.at),
    [raw[20].at, raw[61].at, raw[100].at],
  );
});

test('the live line reaches the last fix even when the fixes at its end are vague', () => {
  const ride = [
    ...Array.from({ length: 10 }, (_, s) => fix(s, 0, s * 8)),
    ...Array.from({ length: 10 }, (_, s) => fix(10 + s, 0, 80 + s * 8, 40)),
  ];
  const drawn = displayFixes(ride);
  assert.equal(drawn.at(-1), ride.at(-1));
  assert.ok(metres(drawn.at(-1), fix(0, 0, 80 + 9 * 8)) < 0.01);
});

test('a held stop is not moved past the accuracy circle it was held in', () => {
  const wander = noise(5);
  const ride = [
    ...Array.from({ length: 6 }, (_, s) => fix(s, 0, s * 8)),
    ...Array.from({ length: 20 }, (_, s) => fix(6 + s, wander() * 4, 40 + wander() * 4)),
    ...Array.from({ length: 6 }, (_, s) => fix(26 + s, 0, 48 + s * 8)),
  ];
  const stop = displayFixes(ride).find((f) => f.time === ride[5].time);
  assert.ok(metres(stop, ride[5]) <= 10 + SLACK_M);
});

test('an empty or one-fix ride draws what there is', () => {
  assert.deepEqual(displayFixes([]), []);
  const one = fix(0, 0, 0);
  assert.deepEqual(displayFixes([one]), [one]);
});

test('a two-hour ride of 7000 fixes is steadied in well under a second', () => {
  const raw = Array.from({ length: 7000 }, (_, s) => fix(s, ((s * 7) % 41) - 20, s * 6, 25));
  const start = performance.now();
  displayFixes(raw);
  const took = performance.now() - start;
  assert.ok(took < 500, `took ${Math.round(took)} ms`);
});

// The drawn line is the only thing that changed: what is stored and uploaded
// is the same as before, pinned by hashes taken before display-path.ts existed.
test('what is stored and uploaded is byte-identical to before', () => {
  const fixes = rideFixes();
  const sha = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
  const id = '11111111-0000-0000-0000-000000000001';
  const packed = packRecording(rideRecording(id, fixes), fixes, 1, T0 + 3_600_000);
  assert.equal(sha(packed), '92b224ff30feaa8aacf2ad1e9dca744b0b3881a8c8d7dc0fab51a4e81c500bbb');
  assert.equal(
    sha(keptFixes(fixes)),
    '2b5bdba203326d081f43723427945a4a505a46fedd612c83331534fa7716aa08',
  );
});

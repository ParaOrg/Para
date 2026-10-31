// A recording's walked and ridden distance and time (src/features/contribute/api/walk-ride-split.ts),
// as the upload sends them in walk_m, ride_m, walk_s and ride_s: they add up to the totals, no
// switches is all ride, and the studio reads the same walk and ride parts from the uploaded events.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/walk-ride-split-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { packRecording } from '../../src/features/contribute/api/pack-recording.ts';
import { walkRideSplit } from '../../src/features/contribute/api/walk-ride-split.ts';
import { contributionPayloadSchema } from '../../src/features/contribute/api/contribution-payload-schema.ts';
import { summarize } from '../../src/features/routes/model/ride-recording.ts';
import { partsOf } from '../../src/features/studio/data/contribution-events.ts';

import { T0, rideFixes, rideRecording } from './fixtures/contribution-ride.mjs';

const ID = '11111111-0000-0000-0000-000000000002';
const s = (seconds) => T0 + seconds * 1000;

function packed(recording, fixes = rideFixes()) {
  const result = packRecording(recording, fixes, 1, s(3600));
  assert.equal(result.ok, true);
  assert.ok(contributionPayloadSchema.safeParse(result.payload).success);
  return result.payload;
}

/** Within 1%: distances are great-circle, and legs inside a hinto do not count. */
function assertNear(actual, expected) {
  assert.ok(Math.abs(actual - expected) <= expected / 100, `${actual} is near ${expected}`);
}

function assertAddsUp(payload) {
  for (const key of ['walk_m', 'ride_m', 'walk_s', 'ride_s']) {
    assert.ok(Number.isInteger(payload[key]) && payload[key] >= 0, `${key} is a whole number`);
  }
  assert.equal(payload.walk_m + payload.ride_m, payload.distance_m);
  assert.equal(payload.walk_s + payload.ride_s, payload.moving_s + payload.standing_s);
}

test('the example ride: a minute on Lakad at 8 m a second, then Sakay to the end', () => {
  const payload = packed(rideRecording(ID, rideFixes()));
  assertNear(payload.walk_m, 60 * 8);
  assert.equal(payload.walk_s, 60);
  assertAddsUp(payload);
});

test('no switches is all ride, as the server reads a contribution with no mode events', () => {
  const payload = packed({ ...rideRecording(ID, rideFixes()), modes: [] });
  assert.equal(payload.walk_m, 0);
  assert.equal(payload.walk_s, 0);
  assert.equal(payload.ride_m, payload.distance_m);
  assertAddsUp(payload);
});

test('a stand on Lakad is walking time; a switch back to Sakay counts the rest as ride', () => {
  const recording = {
    ...rideRecording(ID, rideFixes()),
    modes: [
      { time: s(0), to: 'walk' },
      { time: s(800), to: 'ride' },
    ],
  };
  const payload = packed(recording);
  assert.equal(payload.walk_s, 800);
  // Moving 8 m a second for 800 s less the two-minute stand.
  assertNear(payload.walk_m, (800 - 120) * 8);
  assertAddsUp(payload);
});

test('lost and paused time count toward neither', () => {
  const fixes = rideFixes().filter((f) => f.time < s(20) || f.time >= s(40));
  const recording = {
    ...rideRecording(ID, fixes),
    // A Stop and Resume on Lakad, after the phone was silent from its fix at 19 s to the one at 40 s.
    gaps: [{ from: s(45), to: s(50), reasons: ['paused'] }],
  };
  const payload = packed(recording, fixes);
  assert.equal(payload.walk_s, 60 - 21 - 5);
  assertAddsUp(payload);
});

test('several switches: the distance goes to the mode each leg arrived in', () => {
  const fixes = rideFixes(400);
  const modes = [
    { time: s(0), to: 'walk' },
    { time: s(100), to: 'ride' },
    { time: s(200), to: 'walk' },
    { time: s(300), to: 'ride' },
  ];
  const ended = fixes.at(-1).time;
  const summary = summarize(fixes, [], T0, ended, modes);
  const split = walkRideSplit(fixes, [], T0, ended, modes);
  assertNear(split.walkM, 200 * 8);
  assert.equal(split.walkSeconds, 200);
  assert.ok(Math.abs(split.walkM + split.rideM - summary.distanceM) < 1e-6);
  assert.equal(
    split.walkSeconds + split.rideSeconds,
    summary.movingSeconds + summary.standingSeconds,
  );
});

test("the studio's reading of the uploaded events gives the app's walk time", () => {
  const payload = packed(rideRecording(ID, rideFixes()));
  const parts = partsOf(
    payload.events,
    Date.parse(payload.started_at),
    Date.parse(payload.ended_at),
  );
  const walkMs = parts.filter((p) => p.mode === 'walk').reduce((sum, p) => sum + p.to - p.from, 0);
  assert.equal(walkMs / 1000, payload.walk_s);
});

// The upload's packing (src/features/contribute/api/pack-recording.ts): a saved
// recording in the database's shape, with the points the database would refuse
// dropped beforehand, so a real ride is never refused whole for one bad fix.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/pack-recording-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { UPLOAD_LIMITS, packRecording } from '../../src/features/contribute/api/pack-recording.ts';
import { contributionPayloadSchema } from '../../src/features/contribute/api/contribution-payload-schema.ts';
import { problemOf } from '../../src/features/contribute/api/upload-contribution.ts';

import { T0, rideFixes, rideRecording } from './fixtures/contribution-ride.mjs';

const ID = '11111111-0000-0000-0000-000000000001';
const SENT = T0 + 3_600_000;

function packed(fixes = rideFixes(), recording = rideRecording(ID, fixes)) {
  const result = packRecording(recording, fixes, 1, SENT);
  assert.equal(result.ok, true);
  return result;
}

/** Every point back in absolute millionths, as the database adds the batches up. */
function absolutePoints(payload) {
  return payload.batches.flatMap((b) => {
    let time = Date.parse(b.first_at);
    let lat = b.first_lat;
    let lng = b.first_lng;
    return b.dt_ms.map((dt, i) => {
      if (i > 0) {
        time += dt;
        lat += b.dlat[i];
        lng += b.dlng[i];
      }
      return { time, lat, lng };
    });
  });
}

test('a ride packs into batches of at most 600 that add back up to its points', () => {
  const { payload, droppedPoints } = packed();
  assert.equal(payload.batches.length, 3);
  assert.deepEqual(
    payload.batches.map((b) => b.point_count),
    [600, 600, 100],
  );
  assert.deepEqual(
    payload.batches.map((b) => b.seq),
    [0, 1, 2],
  );
  assert.equal(payload.point_count, 1300);
  assert.equal(droppedPoints, 3);
  const points = absolutePoints(payload);
  assert.equal(points.length, 1300);
  assert.equal(points[0].lat, 14_700_000);
  for (const b of payload.batches) assert.deepEqual([b.dt_ms[0], b.dlat[0], b.dlng[0]], [0, 0, 0]);
});

test('what reaches the database is in the Philippines, in time order, and never faster than the limit', () => {
  const { payload } = packed();
  const points = absolutePoints(payload);
  for (let i = 1; i < points.length; i += 1) {
    const [a, b] = [points[i - 1], points[i]];
    assert.ok(b.time > a.time, `point ${i} after the one before`);
    assert.ok(
      b.lat >= 4_000_000 && b.lat <= 22_000_000 && b.lng >= 116_000_000 && b.lng <= 127_000_000,
    );
    const cos = Math.cos((b.lat / 1e6) * (Math.PI / 180));
    const metres = 0.11132 * Math.hypot(b.lat - a.lat, (b.lng - a.lng) * cos);
    assert.ok(metres / ((b.time - a.time) / 1000) <= 150 / 3.6, `point ${i} under 150 km/h`);
  }
});

test('the details go in the database names and limits; the stand is a hinto', () => {
  const { payload } = packed();
  assert.equal(payload.id, ID);
  assert.equal(payload.vehicle, 'jeep');
  assert.equal(payload.start_name, 'Fairview');
  assert.equal(payload.started_at, new Date(T0).toISOString());
  assert.equal(payload.sent_at, new Date(SENT).toISOString());
  assert.deepEqual(
    payload.events.map((e) => e.kind),
    ['start', 'switch', 'stop', 'save'],
  );
  assert.equal(payload.hintos.length, 1);
  assert.ok(payload.hintos[0].seconds >= 100 && payload.hintos[0].seconds <= 130);
  assert.equal(payload.line.type, 'LineString');
  assert.ok(payload.line.coordinates.length < 100, 'a straight street thins to a few points');
  assert.ok(payload.south <= payload.north && payload.west <= payload.east);
  assert.ok(contributionPayloadSchema.safeParse(payload).success);
});

test('long names are cut to the database limits rather than refused', () => {
  const fixes = rideFixes(20);
  const recording = {
    ...rideRecording(ID, fixes),
    endPointName: 'x'.repeat(200),
    description: 'y'.repeat(2000),
  };
  const { payload } = packed(fixes, recording);
  assert.equal(payload.end_name.length, UPLOAD_LIMITS.nameLength);
  assert.equal(payload.description.length, UPLOAD_LIMITS.descriptionLength);
});

test('packing again packs the same contribution: a retry sends what the first try sent', () => {
  const fixes = rideFixes();
  const recording = rideRecording(ID, fixes);
  const first = packRecording(recording, fixes, 1, SENT);
  const again = packRecording(recording, fixes, 1, SENT + 60_000);
  assert.deepEqual({ ...first.payload, sent_at: null }, { ...again.payload, sent_at: null });
});

test('a recording the database could never take is refused here, with the reason', () => {
  const fixes = rideFixes(20);
  const long = { ...rideRecording(ID, fixes), stoppedAt: T0 + 7 * 3_600_000 };
  assert.deepEqual(packRecording(long, fixes, 1, SENT), { ok: false, reason: 'too-long' });
  const many = Array.from({ length: UPLOAD_LIMITS.points + 1 }, (_, s) => ({
    time: T0 + s * 1000,
    at: [121.05, 14.7 + s / 1e6],
    accuracyM: 5,
  }));
  const manyRecording = { ...rideRecording(ID, many), stoppedAt: T0 + 5 * 3_600_000 };
  assert.deepEqual(packRecording(manyRecording, many, 1, SENT), {
    ok: false,
    reason: 'too-many-points',
  });
});

test('a recording with no fixes packs with no points and no line', () => {
  const recording = rideRecording(ID, [{ time: T0 + 5000 }]);
  const result = packRecording(recording, [], 1, SENT);
  assert.equal(result.ok, true);
  assert.equal(result.payload.point_count, 0);
  assert.equal(result.payload.line, null);
  assert.equal(result.payload.west, null);
  assert.ok(Date.parse(result.payload.ended_at) > Date.parse(result.payload.started_at));
});

test('an answer is sorted into what the page does next', () => {
  assert.equal(
    problemOf({ code: 'P0001', message: 'day_cap: 20 contributions in 24 hours' }),
    'day-cap',
  );
  assert.equal(
    problemOf({ code: 'P0001', message: 'bad_points: point 3 is faster than 150 km/h' }),
    'refused',
  );
  assert.equal(
    problemOf({ code: '42501', message: 'new row violates row-level security policy' }),
    'blocked',
  );
  assert.equal(problemOf({ code: '23514', message: 'check constraint' }), 'refused');
  assert.equal(problemOf({ code: '', message: 'TypeError: Failed to fetch' }), 'offline');
});

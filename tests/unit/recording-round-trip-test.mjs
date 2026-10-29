// A recording packed the way the phone sends it (src/features/contribute/api/pack-recording.ts)
// and read back the way the database adds the batches up comes back within 0.1 m and 1 ms.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/recording-round-trip-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { packRecording } from '../../src/features/contribute/api/pack-recording.ts';
import { UPLOAD_LIMITS } from '../../src/features/contribute/recorder/recording-limits.ts';

import { T0, rideRecording } from './fixtures/contribution-ride.mjs';

const ID = '11111111-0000-0000-0000-000000000002';
const M_PER_DEG_LAT = 111_320;
const MAX_ERROR_M = 0.1;
const MAX_ERROR_MS = 1;

/** Every point back in degrees and milliseconds, as the database adds the batches up. */
function decode(payload) {
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
      return { time, at: [lng / 1e6, lat / 1e6], accuracyM: b.accuracy_m[i] };
    });
  });
}

function metresBetween([lngA, latA], [lngB, latB]) {
  const cos = Math.cos((latA * Math.PI) / 180);
  return Math.hypot((latB - latA) * M_PER_DEG_LAT, (lngB - lngA) * M_PER_DEG_LAT * cos);
}

/** Packs the fixes and checks every one came back, in order, inside the tolerance. */
function assertRoundTrip(fixes) {
  const result = packRecording(rideRecording(ID, fixes), fixes, 1, T0 + 86_400_000);
  assert.equal(result.ok, true);
  const back = decode(result.payload);
  assert.equal(back.length, fixes.length);
  fixes.forEach((fix, i) => {
    assert.ok(Math.abs(back[i].time - fix.time) <= MAX_ERROR_MS, `fix ${i} within 1 ms`);
    assert.ok(metresBetween(back[i].at, fix.at) <= MAX_ERROR_M, `fix ${i} within 0.1 m`);
  });
  return result.payload;
}

/** A ride moving north at `speed` m/s, one fix every `step` ms, from the given start. */
function ride(
  count,
  { step = 1000, speed = 5, startLng = 121.0512345, startLat = 14.7012345 } = {},
) {
  return Array.from({ length: count }, (_, i) => ({
    time: T0 + i * step,
    at: [startLng + i * 0.0000013, startLat + (i * speed * (step / 1000)) / M_PER_DEG_LAT],
    accuracyM: 5,
  }));
}

test('one point comes back as it went', () => {
  const payload = assertRoundTrip(ride(1));
  assert.equal(payload.batches.length, 1);
  assert.equal(payload.batches[0].point_count, 1);
});

test('a ride with fractions of a degree and of a second comes back within 0.1 m and 1 ms', () => {
  const fixes = ride(1300).map((fix, i) => ({ ...fix, time: fix.time + (i % 7) * 0.4 }));
  assertRoundTrip(fixes);
});

test('a ride at the cap of points comes back whole, in batches of at most 600', () => {
  const payload = assertRoundTrip(ride(UPLOAD_LIMITS.points));
  assert.equal(payload.point_count, UPLOAD_LIMITS.points);
  assert.ok(payload.batches.every((b) => b.point_count <= UPLOAD_LIMITS.pointsPerBatch));
  assert.equal(payload.batches.length, UPLOAD_LIMITS.points / UPLOAD_LIMITS.pointsPerBatch);
});

test('a long gap between two fixes comes back, a batch boundary in it or not', () => {
  const hour = 3_600_000;
  const before = ride(10);
  const after = ride(10, { startLat: 14.72 }).map((fix, i) => ({
    ...fix,
    time: T0 + 9000 + hour + i * 1000,
  }));
  assertRoundTrip([...before, ...after]);
  const atBoundary = ride(UPLOAD_LIMITS.pointsPerBatch).map((fix) => fix);
  const next = ride(5, { startLat: 14.72 }).map((fix, i) => ({
    ...fix,
    time: T0 + (UPLOAD_LIMITS.pointsPerBatch - 1) * 1000 + hour + i * 1000,
  }));
  assertRoundTrip([...atBoundary, ...next]);
});

// The mark button's rules (src/features/contribute/recorder/recording-marks.ts): where a
// mark is on the map, and how many a ride keeps.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/recording-marks-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_MARKS,
  markPlaces,
  marksThatFit,
  withMark,
} from '../../src/features/contribute/recorder/recording-marks.ts';
import { recordingSchema } from '../../src/features/contribute/storage/recording-schema.ts';
import { rideRecording, rideFixes } from './fixtures/contribution-ride.mjs';

const fix = (time, lng) => ({ time, at: [lng, 14.6], accuracyM: 5 });
const FIXES = [fix(1000, 121.0), fix(2000, 121.001), fix(3000, 121.002)];

test('a mark sits on the latest fix at or before the tap', () => {
  assert.deepEqual(markPlaces(FIXES, [{ time: 2500 }, { time: 3000 }, { time: 9000 }]), [
    [121.001, 14.6],
    [121.002, 14.6],
    [121.002, 14.6],
  ]);
});

test('a tap before the first fix takes the first fix; with no fix there is no pin', () => {
  assert.deepEqual(markPlaces(FIXES, [{ time: 10 }]), [[121.0, 14.6]]);
  assert.deepEqual(markPlaces([], [{ time: 10 }]), []);
});

test('a mark is added at its time, in order', () => {
  assert.deepEqual(withMark([{ time: 1 }], 2), [{ time: 1 }, { time: 2 }]);
});

test('a ride holds no more than MAX_MARKS; the next tap changes nothing', () => {
  const full = Array.from({ length: MAX_MARKS }, (_, time) => ({ time }));
  assert.equal(withMark(full, 999), full);
  assert.equal(withMark(full.slice(1), 999).length, MAX_MARKS);
});

test('marks fit beside what the upload always carries, earliest first', () => {
  const marks = Array.from({ length: 10 }, (_, time) => ({ time }));
  assert.equal(marksThatFit(marks, 496).length, 4);
  assert.deepEqual(marksThatFit(marks, 496)[0], { time: 0 });
  assert.equal(marksThatFit(marks, 900).length, 0);
});

test('a stored recording parses with marks, and an older one without them', () => {
  const recording = rideRecording('id-1', rideFixes(5));
  assert.ok(recordingSchema.safeParse({ ...recording, marks: [{ time: 5 }] }).success);
  assert.ok(recordingSchema.safeParse(recording).success);
});

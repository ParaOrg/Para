// A recording as the phone stores it, of either version (src/features/contribute/storage/recording-schema.ts):
// version 2 keeps its Lakad and Sakay modes; one kept as version 1, with its Papunta and Pabalik
// switches, reads as version 2 and all Sakay, so it opens, uploads and draws as a ride.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/recording-versions-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { currentMode } from '../../src/features/routes/model/ride-recording.ts';
import {
  recordingSchema,
  storedRecordingSchema,
} from '../../src/features/contribute/storage/recording-schema.ts';
import { rideFixes, rideRecording } from './fixtures/contribution-ride.mjs';

const current = rideRecording('id-1', rideFixes(5));

/** The same recording as version 1 stored it: Papunta, then a switch to Pabalik. */
function versionOne() {
  const { modes: _modes, ...rest } = current;
  return {
    ...rest,
    version: 1,
    switches: [{ time: current.startedAt + 900_000, to: 'return' }],
    hasAutoStopped: true,
  };
}

test('a version 2 recording reads as it was stored', () => {
  const read = storedRecordingSchema.safeParse(current);
  assert.ok(read.success);
  assert.deepEqual(read.data, current);
});

test('a version 1 recording reads as version 2 with no modes, so all ride; its switches are dropped', () => {
  const read = storedRecordingSchema.safeParse(versionOne());
  assert.ok(read.success);
  assert.equal(read.data.version, 2);
  assert.deepEqual(read.data.modes, []);
  assert.equal(currentMode(read.data.modes), 'ride');
  assert.equal('switches' in read.data, false);
  assert.equal('hasAutoStopped' in read.data, false);
  assert.equal(read.data.startPointName, current.startPointName);
  // What it reads as is a recording the current schema takes, so it can be stored again.
  assert.ok(recordingSchema.safeParse(read.data).success);
});

test('a version 1 recording made before switches and marks reads too', () => {
  const { switches: _switches, ...bare } = versionOne();
  assert.ok(storedRecordingSchema.safeParse(bare).success);
});

test('a version 2 recording without modes, or an unknown version, does not read', () => {
  const { modes: _modes, ...noModes } = current;
  assert.equal(storedRecordingSchema.safeParse(noModes).success, false);
  assert.equal(storedRecordingSchema.safeParse({ ...current, version: 3 }).success, false);
});

// The import of the app's native fix log on reopening (src/features/contribute/native/import-fix-log.ts)
// and the one step every fix takes into a ride (recording-fixes.ts takeWatchedFixes): a stopped ride
// takes nothing after its Stop, a running one takes the whole log, a log with nothing new adds
// nothing, and another recording's log is left alone.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/import-fix-log-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fixLogRows } from '../../src/features/contribute/native/import-fix-log.ts';
import {
  rowOfFix,
  takeWatchedFixes,
} from '../../src/features/contribute/recorder/recording-fixes.ts';

const ID = 'ride-1';
const STEP_S = 10;
const STEP_LAT = 40 / 111_000;
const OUT = 40;

/** A ride north and back to where it began, one fix every ten seconds, as the native log hands it over. */
function rideThereAndBack() {
  const fixes = [];
  for (let index = 0; index <= 2 * OUT; index++) {
    const along = index <= OUT ? index : 2 * OUT - index;
    fixes.push({
      timestamp: 1_000_000 + index * STEP_S * 1000,
      coords: { longitude: 121, latitude: 14.6 + along * STEP_LAT, accuracy: 5 },
    });
  }
  return fixes;
}

const asFix = (watched) => ({
  time: watched.timestamp,
  at: [watched.coords.longitude, watched.coords.latitude],
  accuracyM: watched.coords.accuracy,
});
const storedRows = (watched) => watched.map((fix, seq) => rowOfFix(ID, seq, asFix(fix)));
const times = (rows) => rows.map((row) => row.time);

const ride = rideThereAndBack();

function recording(change = {}) {
  return {
    version: 2,
    id: ID,
    status: 'recording',
    startedAt: ride[0].timestamp,
    stoppedAt: null,
    savedAt: null,
    gaps: [],
    modes: [{ time: ride[0].timestamp, to: 'walk' }],
    marks: [],
    startPointName: '',
    endPointName: '',
    description: '',
    rideKind: null,
    ...change,
  };
}

test('a stopped ride takes the fixes after the stored ones up to its Stop, and nothing after', () => {
  const stoppedAt = ride[20].timestamp;
  const stopped = recording({ status: 'stopped', stoppedAt });
  const rows = fixLogRows(stopped, { recordingId: ID, fixes: ride }, storedRows(ride.slice(0, 10)));
  assert.deepEqual(
    times(rows),
    ride.slice(10, 21).map((fix) => fix.timestamp),
  );
  assert.deepEqual(
    rows.map((row) => row.seq),
    Array.from({ length: 11 }, (_, index) => 10 + index),
  );
});

test('a running ride takes the whole log, back at its start or not', () => {
  const rows = fixLogRows(
    recording(),
    { recordingId: ID, fixes: ride },
    storedRows(ride.slice(0, 30)),
  );
  assert.deepEqual(
    times(rows),
    ride.slice(30).map((fix) => fix.timestamp),
  );
});

test('a log with nothing after the stored fixes adds nothing, so importing twice is harmless', () => {
  const running = recording();
  const stored = storedRows(ride.slice(0, 30));
  assert.deepEqual(fixLogRows(running, { recordingId: ID, fixes: ride.slice(0, 30) }, stored), []);
  const once = fixLogRows(running, { recordingId: ID, fixes: ride }, stored);
  assert.deepEqual(fixLogRows(running, { recordingId: ID, fixes: ride }, [...stored, ...once]), []);
});

test('a log read from the last stored fix imports what the whole log would', () => {
  const stored = storedRows(ride.slice(0, 30));
  const after = stored[stored.length - 1].time;
  const fromLast = ride.filter((fix) => fix.timestamp > after);
  for (const each of [
    recording(),
    recording({ status: 'stopped', stoppedAt: ride[50].timestamp }),
  ]) {
    assert.deepEqual(
      fixLogRows(each, { recordingId: ID, fixes: fromLast }, stored),
      fixLogRows(each, { recordingId: ID, fixes: ride }, stored),
    );
  }
});

test("another recording's log, or none, adds nothing", () => {
  for (const recordingId of ['ride-2', null]) {
    assert.deepEqual(
      fixLogRows(recording(), { recordingId, fixes: ride }, storedRows(ride.slice(0, 5))),
      [],
    );
  }
});

test('the live step takes fixes once, in order, the whole batch', () => {
  const held = ride.slice(0, 30).map(asFix);
  const shuffled = [...ride.slice(25)].reverse();
  assert.deepEqual(
    takeWatchedFixes(held, shuffled).map((fix) => fix.time),
    ride.slice(30).map((fix) => fix.timestamp),
  );
  assert.deepEqual(takeWatchedFixes(held, []), []);
});

test('at a Stop the live step takes the fixes up to it and none after', () => {
  const held = ride.slice(0, 30).map(asFix);
  assert.equal(takeWatchedFixes(held, ride, ride[2 * OUT].timestamp).length, ride.length - 30);
  assert.equal(takeWatchedFixes(held, ride, ride[35].timestamp).length, 6);
});

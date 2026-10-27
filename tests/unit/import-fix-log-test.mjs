// The import of the app's native fix log on reopening (src/features/contribute/native/import-fix-log.ts)
// and the one step every fix takes into a ride (recording-fixes.ts takeWatchedFixes): a stopped ride
// takes nothing after its Stop, a running one is cut where it came back to its start, a log with
// nothing new adds nothing, and another recording's log is left alone.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/import-fix-log-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { fixLogImport } from '../../src/features/contribute/native/import-fix-log.ts';
import { rowOfFix, takeWatchedFixes } from '../../src/features/contribute/recording-fixes.ts';

const ID = 'ride-1';
const STEP_S = 10;
// About 40 m north per fix: 40 fixes out is 1.6 km, past the auto-stop's arming distance.
const STEP_LAT = 40 / 111_000;
const OUT = 40;
// Back within 300 m of the start: seven steps of 40 m from it on the way back (eight is 320 m).
const BACK_AT = 2 * OUT - 7;

/** A ride north and back, one fix every ten seconds, as the native log hands it over. */
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
const turnAt = ride[OUT].timestamp;

function recording(change = {}) {
  return {
    version: 1,
    id: ID,
    status: 'recording',
    startedAt: ride[0].timestamp,
    stoppedAt: null,
    savedAt: null,
    gaps: [],
    switches: [{ time: turnAt, to: 'return' }],
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
  const stopped = recording({ status: 'stopped', stoppedAt, switches: [] });
  const result = fixLogImport(
    stopped,
    { recordingId: ID, fixes: ride },
    storedRows(ride.slice(0, 10)),
  );
  assert.deepEqual(
    times(result.rows),
    ride.slice(10, 21).map((fix) => fix.timestamp),
  );
  assert.deepEqual(
    result.rows.map((row) => row.seq),
    Array.from({ length: 11 }, (_, index) => 10 + index),
  );
  assert.equal(result.recording, stopped);
});

test('a stopped ride is not stopped again where it came back to its start', () => {
  const stoppedAt = ride[2 * OUT].timestamp;
  const stopped = recording({ status: 'stopped', stoppedAt });
  const result = fixLogImport(
    stopped,
    { recordingId: ID, fixes: ride },
    storedRows(ride.slice(0, 30)),
  );
  assert.equal(result.rows.length, ride.length - 30);
  assert.equal(result.recording, stopped);
});

test('a running ride that came back to its start in the log stops at that fix', () => {
  const result = fixLogImport(
    recording(),
    { recordingId: ID, fixes: ride },
    storedRows(ride.slice(0, 30)),
  );
  assert.deepEqual(
    times(result.rows),
    ride.slice(30, BACK_AT + 1).map((fix) => fix.timestamp),
  );
  assert.equal(result.recording.status, 'stopped');
  assert.equal(result.recording.stoppedAt, ride[BACK_AT].timestamp);
  assert.equal(result.recording.hasAutoStopped, true);
});

test('a running ride that already stopped itself once takes the whole log', () => {
  const resumed = recording({ hasAutoStopped: true });
  const result = fixLogImport(
    resumed,
    { recordingId: ID, fixes: ride },
    storedRows(ride.slice(0, 30)),
  );
  assert.equal(result.rows.length, ride.length - 30);
  assert.equal(result.recording, resumed);
});

test('a log with nothing after the stored fixes adds nothing, so importing twice is harmless', () => {
  const running = recording({ switches: [] });
  const stored = storedRows(ride.slice(0, 30));
  const first = fixLogImport(running, { recordingId: ID, fixes: ride.slice(0, 30) }, stored);
  assert.deepEqual(first.rows, []);
  assert.equal(first.recording, running);
  const once = fixLogImport(running, { recordingId: ID, fixes: ride }, stored);
  const twice = fixLogImport(running, { recordingId: ID, fixes: ride }, [...stored, ...once.rows]);
  assert.deepEqual(twice.rows, []);
});

test('a ride killed between its auto-stop fix and its stop, with nothing new, imports nothing', () => {
  // The fix that brought it back to its start was stored; the stop was not.
  const running = recording();
  const stored = storedRows(ride.slice(0, BACK_AT + 1));
  const result = fixLogImport(
    running,
    { recordingId: ID, fixes: ride.slice(0, BACK_AT + 1) },
    stored,
  );
  assert.deepEqual(result.rows, []);
  assert.equal(result.recording, running);
  const live = takeWatchedFixes(ride.slice(0, BACK_AT + 1).map(asFix), [], running);
  assert.deepEqual(live, { taken: [], isBackAtStart: false });
});

test('a log read from the last stored fix imports what the whole log would', () => {
  const stored = storedRows(ride.slice(0, 30));
  const after = stored[stored.length - 1].time;
  const fromLast = ride.filter((fix) => fix.timestamp > after);
  for (const each of [
    recording({ switches: [] }),
    recording(),
    recording({ status: 'stopped', stoppedAt: ride[50].timestamp }),
  ]) {
    assert.deepEqual(
      fixLogImport(each, { recordingId: ID, fixes: fromLast }, stored),
      fixLogImport(each, { recordingId: ID, fixes: ride }, stored),
    );
  }
});

test("another recording's log, or none, adds nothing", () => {
  const running = recording();
  for (const recordingId of ['ride-2', null]) {
    const result = fixLogImport(
      running,
      { recordingId, fixes: ride },
      storedRows(ride.slice(0, 5)),
    );
    assert.deepEqual(result.rows, []);
    assert.equal(result.recording, running);
  }
});

test('the live step takes fixes once, in order, and cuts a batch where the ride came back', () => {
  const held = ride.slice(0, 30).map(asFix);
  const shuffled = [...ride.slice(25)].reverse();
  const { taken, isBackAtStart } = takeWatchedFixes(held, shuffled, recording());
  assert.equal(isBackAtStart, true);
  assert.deepEqual(
    taken.map((fix) => fix.time),
    ride.slice(30, BACK_AT + 1).map((fix) => fix.timestamp),
  );
});

test('at a Stop the live step takes the fixes up to it and does not check for the start', () => {
  const held = ride.slice(0, 30).map(asFix);
  const until = ride[2 * OUT].timestamp;
  const { taken, isBackAtStart } = takeWatchedFixes(held, ride, recording(), until);
  assert.equal(isBackAtStart, false);
  assert.equal(taken.length, ride.length - 30);
  const early = takeWatchedFixes(held, ride, recording(), ride[35].timestamp);
  assert.equal(early.taken.length, 6);
});

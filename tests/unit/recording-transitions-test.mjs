// The recorder's steps on a recording (src/features/contribute/recorder/recording-transitions.ts) and its
// live totals (recording-figures.ts): Start, Stop with the fixes the phone could not keep, Resume
// after a pause or a reload, a switch of way, Save with or without details, and the time and
// distance the stats strip shows.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/recording-transitions-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONSENT_VERSION } from '../../src/features/contribute/consent/consent-version.ts';
import {
  liveFigures,
  summaryEnd,
} from '../../src/features/contribute/recorder/recording-figures.ts';
import {
  newRecording,
  resumedRecording,
  savedRecording,
  stoppedRecording,
  switchedWay,
} from '../../src/features/contribute/recorder/recording-transitions.ts';

const STARTED = 1_000_000;
const running = () => newRecording('ride-1', STARTED);
const stoppedAt = (at, extra) => stoppedRecording(running(), at, 0, extra);

test('a new recording is running from its start, empty, under the current consent', () => {
  const recording = running();
  assert.equal(recording.id, 'ride-1');
  assert.equal(recording.status, 'recording');
  assert.equal(recording.startedAt, STARTED);
  assert.equal(recording.stoppedAt, null);
  assert.equal(recording.savedAt, null);
  assert.deepEqual([recording.gaps, recording.switches, recording.marks], [[], [], []]);
  assert.deepEqual(
    [recording.startPointName, recording.endPointName, recording.description],
    ['', '', ''],
  );
  assert.equal(recording.rideKind, null);
  assert.equal(recording.consentVersion, CONSENT_VERSION);
});

test('a Stop stops it at its time, and carries lost fix writes only when there are some', () => {
  const stopped = stoppedRecording(running(), STARTED + 60_000, 0);
  assert.equal(stopped.status, 'stopped');
  assert.equal(stopped.stoppedAt, STARTED + 60_000);
  assert.equal('failedFixWrites' in stopped, false);
  assert.equal(stoppedRecording(running(), STARTED + 60_000, 3).failedFixWrites, 3);
  assert.equal(stoppedAt(STARTED + 60_000, { hasAutoStopped: true }).hasAutoStopped, true);
});

test('a Resume after a Stop counts the time since the Stop as paused', () => {
  const resumed = resumedRecording(
    stoppedAt(STARTED + 60_000),
    STARTED + 90_000,
    STARTED + 55_000,
    false,
  );
  assert.equal(resumed.status, 'recording');
  assert.equal(resumed.stoppedAt, null);
  assert.deepEqual(resumed.gaps, [
    { from: STARTED + 60_000, to: STARTED + 90_000, reasons: ['paused'] },
  ]);
});

test('a Resume of a recording found open after a reload counts the time since its last fix as lost', () => {
  const open = running();
  const resumed = resumedRecording(open, STARTED + 90_000, STARTED + 40_000, true);
  assert.deepEqual(resumed.gaps, [
    { from: STARTED + 40_000, to: STARTED + 90_000, reasons: ['resumed'] },
  ]);
  const withoutFixes = resumedRecording(open, STARTED + 90_000, null, true);
  assert.deepEqual(withoutFixes.gaps, [
    { from: STARTED, to: STARTED + 90_000, reasons: ['resumed'] },
  ]);
});

test('a Resume of a running recording that never stopped adds no gap', () => {
  assert.deepEqual(resumedRecording(running(), STARTED + 90_000, null, false).gaps, []);
});

test('a switch of way goes to the other way, at its time', () => {
  const first = switchedWay(running(), STARTED + 10_000);
  assert.equal(first.to, 'return');
  assert.deepEqual(first.recording.switches, [{ time: STARTED + 10_000, to: 'return' }]);
  const second = switchedWay(first.recording, STARTED + 20_000);
  assert.equal(second.to, 'outbound');
  assert.equal(second.recording.switches.length, 2);
});

test('a Save keeps the details given, or the recording as it is with none', () => {
  const details = {
    startPointName: 'Cubao',
    endPointName: 'Fairview',
    description: 'EDSA',
    rideKind: null,
  };
  const saved = savedRecording(stoppedAt(STARTED + 60_000), details, STARTED + 70_000, 0);
  assert.equal(saved.status, 'saved');
  assert.equal(saved.savedAt, STARTED + 70_000);
  assert.equal(saved.startPointName, 'Cubao');
  assert.equal(saved.description, 'EDSA');
  const plain = savedRecording(stoppedAt(STARTED + 60_000), null, STARTED + 70_000, 0);
  assert.equal(plain.startPointName, '');
});

test('a Save carries the fix writes still missing, and drops a count they were written since', () => {
  const lost = stoppedRecording(running(), STARTED + 60_000, 4);
  assert.equal(savedRecording(lost, null, STARTED + 70_000, 2).failedFixWrites, 2);
  assert.equal('failedFixWrites' in savedRecording(lost, null, STARTED + 70_000, 0), false);
});

test('the totals of a running recording run to its last fix, or to the end of a later pause', () => {
  const recording = running();
  assert.equal(summaryEnd(recording, true, STARTED + 30_000, STARTED + 99_000), STARTED + 30_000);
  assert.equal(summaryEnd(recording, true, null, STARTED + 99_000), STARTED);
  const resumed = resumedRecording(
    stoppedAt(STARTED + 60_000),
    STARTED + 90_000,
    STARTED + 55_000,
    false,
  );
  assert.equal(summaryEnd(resumed, true, STARTED + 55_000, STARTED + 99_000), STARTED + 90_000);
});

test('the totals of a stopped recording run to its Stop, and of anything else to the clock', () => {
  assert.equal(
    summaryEnd(stoppedAt(STARTED + 60_000), false, STARTED + 55_000, STARTED + 99_000),
    STARTED + 60_000,
  );
  assert.equal(summaryEnd(running(), false, STARTED + 55_000, STARTED + 99_000), STARTED + 99_000);
});

test('the time shown is the clock less the pauses while recording, and the Stop once stopped', () => {
  const summary = { distanceM: 1234, pausedSeconds: 30 };
  assert.deepEqual(liveFigures(running(), summary, true, STARTED + 100_000), {
    elapsedSeconds: 70,
    distanceM: 1234,
  });
  assert.equal(
    liveFigures(stoppedAt(STARTED + 60_000), summary, false, STARTED + 999_000).elapsedSeconds,
    30,
  );
  assert.equal(
    liveFigures(running(), { distanceM: 0, pausedSeconds: 50 }, true, STARTED + 10_000)
      .elapsedSeconds,
    0,
  );
});

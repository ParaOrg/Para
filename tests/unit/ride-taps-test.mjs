// The phone's ride (RidePlugin.now), applied to the page's ride where its taps were made
// (src/features/contribute/recorder/ride-taps.ts): a switch is a mode, a closed gap a gap, a pause
// standing or a Finish the Stop; applied twice, nothing is added twice.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-taps-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  tapsOfNativeRide,
  withRideTaps,
} from '../../src/features/contribute/recorder/ride-taps.ts';
import {
  noteRideWatch,
  setRideNoticeState,
} from '../../src/features/contribute/native/ride-notice.ts';
import { noticePhaseOf } from '../../src/features/contribute/recorder/notice-phase.ts';
import { trailOf } from '../../src/features/contribute/recorder/recording-rules.ts';
import { newRecording } from '../../src/features/contribute/recorder/recording-transitions.ts';

const ID = 'ride-1';
const T0 = Date.UTC(2026, 10, 2, 0, 0, 0);
const at = (seconds) => T0 + seconds * 1000;

/** The phone's ride, as RidePlugin.now gives it. */
const nativeRide = ({ phase = 'recording', modes = [], gaps = [], finishedAt = 0 } = {}) => ({
  recordingId: ID,
  phase,
  trouble: 'none',
  startedAt: T0,
  finishedAt,
  lastFixAt: T0,
  modes: [{ time: T0, to: 'walk' }, ...modes],
  gaps,
});
const gap = (from, to, reason = 'paused') => ({
  from: at(from),
  to: to === 0 ? 0 : at(to),
  reason,
});
const tapsOf = (ride) => tapsOfNativeRide(ride, ID);

test('a switch, a pause resumed, and a pause standing', () => {
  const taps = tapsOf(
    nativeRide({
      phase: 'paused',
      modes: [{ time: at(60), to: 'ride' }],
      gaps: [gap(120, 180), gap(300, 0)],
    }),
  );
  const { recording, stopAt, isFinished } = withRideTaps(newRecording(ID, T0), taps);
  assert.deepEqual(recording.modes.at(-1), { time: at(60), to: 'ride' });
  assert.deepEqual(recording.gaps, [{ from: at(120), to: at(180), reasons: ['paused'] }]);
  assert.equal(stopAt, at(300));
  assert.equal(isFinished, false);
});

test('a ride recording has no Stop, and its open gap is not one', () => {
  const taps = tapsOf(nativeRide({ gaps: [gap(10, 20)] }));
  assert.equal(taps.openPause, null);
  assert.equal(withRideTaps(newRecording(ID, T0), taps).stopAt, null);
});

test('Finish while recording stops the ride there, for its details', () => {
  const { stopAt, isFinished } = withRideTaps(
    newRecording(ID, T0),
    tapsOf(nativeRide({ phase: 'finished', finishedAt: at(600) })),
  );
  assert.equal(stopAt, at(600));
  assert.equal(isFinished, true);
});

test('Finish after a pause stops the ride at the pause', () => {
  const { stopAt, isFinished } = withRideTaps(
    newRecording(ID, T0),
    tapsOf(nativeRide({ phase: 'finished', finishedAt: at(900), gaps: [gap(400, 0)] })),
  );
  assert.equal(stopAt, at(400));
  assert.equal(isFinished, true);
});

test('a ride the page already stopped only goes to its details', () => {
  const stopped = { ...newRecording(ID, T0), status: 'stopped', stoppedAt: at(400) };
  const { recording, stopAt, isFinished } = withRideTaps(
    stopped,
    tapsOf(nativeRide({ phase: 'finished', finishedAt: at(900), gaps: [gap(400, 0)] })),
  );
  assert.equal(stopAt, null);
  assert.equal(isFinished, true);
  assert.equal(recording.stoppedAt, at(400));
});

test('applied twice, a switch or a gap is not added twice', () => {
  const taps = tapsOf(
    nativeRide({
      modes: [{ time: at(60), to: 'ride' }],
      gaps: [gap(120, 180), gap(200, 260, 'resumed')],
    }),
  );
  const once = withRideTaps(newRecording(ID, T0), taps).recording;
  const twice = withRideTaps(once, taps).recording;
  assert.deepEqual(twice.modes, once.modes);
  assert.deepEqual(twice.gaps, once.gaps);
  assert.deepEqual(once.gaps.at(-1), { from: at(200), to: at(260), reasons: ['resumed'] });
});

test('a switch to the mode already on adds nothing', () => {
  const taps = tapsOf(nativeRide({ modes: [{ time: at(60), to: 'walk' }] }));
  const { recording } = withRideTaps(newRecording(ID, T0), taps);
  assert.equal(recording.modes.length, 1);
});

test('the phone holding another ride, or none, gives this one nothing', () => {
  assert.equal(tapsOfNativeRide({ ...nativeRide(), recordingId: 'other' }, ID), null);
  assert.equal(tapsOf({ ...nativeRide(), phase: 'none' }), null);
});

test('Sakay tapped with the screen off splits the trail at the tap, not when the page woke', () => {
  // A fix a second for ten minutes, 5 m apart; Sakay tapped at 1:00, the page awake at 9:00.
  const fixes = Array.from({ length: 600 }, (_, s) => ({
    time: at(s),
    at: [121.0 + (s * 5) / 107_600, 14.6],
    accuracyM: 5,
  }));
  const taps = tapsOf(nativeRide({ modes: [{ time: at(60), to: 'ride' }] }));
  const { recording } = withRideTaps(newRecording(ID, T0), taps);
  const { lines } = trailOf(fixes, recording.modes);
  assert.deepEqual(
    lines.map((line) => line.mode),
    ['walk', 'ride'],
  );
  // The walked line ends, and the ridden one starts, at the fix taken at the tap.
  assert.deepEqual(lines[0].path.at(-1), fixes[60].at);
  assert.deepEqual(lines[1].path[0], fixes[60].at);
});

test('the ride notification is told nothing while the page loads, and no ride outside one', () => {
  // A "no ride" told while loading would end a ride the app's service still records.
  assert.equal(noticePhaseOf('loading'), null);
  assert.equal(noticePhaseOf('recording'), 'recording');
  assert.equal(noticePhaseOf('paused'), 'paused');
  for (const phase of ['ready', 'unfinished', 'form'])
    assert.equal(noticePhaseOf(phase), 'none', phase);
});

// Outside the app every word to the plugin throws, so a word sent shows as a throw.
test('a watch starting under a "no ride" still standing sends nothing: it would stop the new ride', () => {
  const noRide = { recordingId: '', phase: 'none', startedAt: 0, modes: [], gaps: [] };
  assert.throws(() => setRideNoticeState({ ...noRide, stoppedAt: null }), /not running inside/);
  assert.doesNotThrow(() => noteRideWatch(true));
  assert.doesNotThrow(() => noteRideWatch(false));
});

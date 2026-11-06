// The taps on the app's ride notification, applied to the ride where they were made
// (src/features/contribute/recorder/ride-events.ts): a switch is a mode, a resumed pause a paused
// gap, a pause standing or a Finish the Stop; applied twice, nothing is added twice.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-events-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  foldRideEvents,
  withRideTaps,
} from '../../src/features/contribute/recorder/ride-events.ts';
import { trailOf } from '../../src/features/contribute/recorder/recording-rules.ts';
import { newRecording } from '../../src/features/contribute/recorder/recording-transitions.ts';

const ID = 'ride-1';
const T0 = Date.UTC(2026, 10, 2, 0, 0, 0);
const at = (seconds) => T0 + seconds * 1000;
const tap = (kind, seconds, to) => ({
  kind,
  time: at(seconds),
  ...(to && { to }),
  recordingId: ID,
});

test('a switch, a pause resumed, and a pause standing', () => {
  const taps = foldRideEvents(
    [tap('mode', 60, 'ride'), tap('pause', 120), tap('resume', 180), tap('pause', 300)],
    ID,
  );
  const { recording, stopAt, isFinished } = withRideTaps(newRecording(ID, T0), taps);
  assert.deepEqual(recording.modes.at(-1), { time: at(60), to: 'ride' });
  assert.deepEqual(recording.gaps, [{ from: at(120), to: at(180), reasons: ['paused'] }]);
  assert.equal(stopAt, at(300));
  assert.equal(isFinished, false);
  assert.equal(taps.lastTime, at(300));
});

test('taps come in any order and are taken in time order', () => {
  const taps = foldRideEvents([tap('resume', 180), tap('pause', 120)], ID);
  assert.deepEqual(taps.pauses, [{ from: at(120), to: at(180) }]);
  assert.equal(taps.openPause, null);
});

test('Finish while recording stops the ride there, for its details', () => {
  const { stopAt, isFinished } = withRideTaps(
    newRecording(ID, T0),
    foldRideEvents([tap('finish', 600)], ID),
  );
  assert.equal(stopAt, at(600));
  assert.equal(isFinished, true);
});

test('Finish after a pause stops the ride at the pause', () => {
  const { stopAt, isFinished } = withRideTaps(
    newRecording(ID, T0),
    foldRideEvents([tap('pause', 400), tap('finish', 900)], ID),
  );
  assert.equal(stopAt, at(400));
  assert.equal(isFinished, true);
});

test('a ride the page already stopped only goes to its details', () => {
  const stopped = { ...newRecording(ID, T0), status: 'stopped', stoppedAt: at(400) };
  const { recording, stopAt, isFinished } = withRideTaps(
    stopped,
    foldRideEvents([tap('finish', 900)], ID),
  );
  assert.equal(stopAt, null);
  assert.equal(isFinished, true);
  assert.equal(recording.stoppedAt, at(400));
});

test('applied twice, a switch or a pause is not added twice', () => {
  const taps = foldRideEvents([tap('mode', 60, 'ride'), tap('pause', 120), tap('resume', 180)], ID);
  const once = withRideTaps(newRecording(ID, T0), taps).recording;
  const twice = withRideTaps(once, taps).recording;
  assert.deepEqual(twice.modes, once.modes);
  assert.deepEqual(twice.gaps, once.gaps);
});

test('a switch to the mode already on adds nothing', () => {
  const taps = foldRideEvents([tap('mode', 60, 'walk')], ID);
  const { recording } = withRideTaps(newRecording(ID, T0), taps);
  assert.equal(recording.modes.length, 1);
});

test('taps on another recording are not this one’s, though they count as taken', () => {
  const taps = foldRideEvents([{ ...tap('pause', 120), recordingId: 'other' }], ID);
  assert.equal(taps.openPause, null);
  assert.equal(taps.lastTime, at(120));
});

test('Sakay tapped with the screen off splits the trail at the tap, not when the page woke', () => {
  // A fix a second for ten minutes, 5 m apart; Sakay tapped at 1:00, the page awake at 9:00.
  const fixes = Array.from({ length: 600 }, (_, s) => ({
    time: at(s),
    at: [121.0 + (s * 5) / 107_600, 14.6],
    accuracyM: 5,
  }));
  const taps = foldRideEvents([tap('mode', 60, 'ride')], ID);
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

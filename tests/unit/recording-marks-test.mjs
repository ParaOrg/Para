// The mark button's rules (src/features/contribute/recorder/recording-marks.ts): where a
// mark is on the map, and how many a ride keeps.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/recording-marks-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_MARKS,
  NOTE_MAX_LENGTH,
  markEvent,
  markFixIndexes,
  markedRecording,
  marksThatFit,
  notedRecording,
  withMark,
} from '../../src/features/contribute/recorder/recording-marks.ts';
import { recordingSchema } from '../../src/features/contribute/storage/recording-schema.ts';
import { rideRecording, rideFixes } from './fixtures/contribution-ride.mjs';

const fix = (time, lng) => ({ time, at: [lng, 14.6], accuracyM: 5 });
const FIXES = [fix(1000, 121.0), fix(2000, 121.001), fix(3000, 121.002)];

test('a mark sits on the latest fix at or before the tap', () => {
  assert.deepEqual(
    markFixIndexes(FIXES, [{ time: 2500 }, { time: 3000 }, { time: 9000 }]),
    [1, 2, 2],
  );
});

test('a tap before the first fix takes the first fix; with no fix there is no pin', () => {
  assert.deepEqual(markFixIndexes(FIXES, [{ time: 10 }]), [0]);
  assert.deepEqual(markFixIndexes([], [{ time: 10 }]), []);
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

test('a running recording takes a mark at the tap and counts it', () => {
  const recording = {
    ...rideRecording('id-1', rideFixes(5)),
    status: 'recording',
    marks: [{ time: 1 }],
  };
  const marked = markedRecording(recording, 9);
  assert.deepEqual(marked.recording.marks, [{ time: 1 }, { time: 9 }]);
  assert.equal(marked.count, 2);
  assert.deepEqual(recording.marks, [{ time: 1 }], 'the recording given is left as it was');
  const older = { ...recording, marks: undefined };
  assert.deepEqual(markedRecording(older, 9).recording.marks, [{ time: 9 }]);
});

test('a stopped recording, or one holding the most marks, takes no mark', () => {
  const recording = { ...rideRecording('id-1', rideFixes(5)), status: 'recording' };
  assert.equal(markedRecording({ ...recording, status: 'stopped' }, 9), null);
  const full = Array.from({ length: MAX_MARKS }, (_, time) => ({ time }));
  assert.equal(markedRecording({ ...recording, marks: full }, 9_999), null);
});

test('a note is kept on its flag, trimmed and cut to NOTE_MAX_LENGTH', () => {
  const recording = { ...rideRecording('id-1', rideFixes(5)), marks: [{ time: 1 }, { time: 2 }] };
  const noted = notedRecording(recording, 1, '  Tapat ng 7-Eleven  ');
  assert.deepEqual(noted.marks, [{ time: 1 }, { time: 2, note: 'Tapat ng 7-Eleven' }]);
  assert.deepEqual(
    recording.marks,
    [{ time: 1 }, { time: 2 }],
    'the recording given is left as it was',
  );
  const long = notedRecording(recording, 0, 'x'.repeat(NOTE_MAX_LENGTH + 50));
  assert.equal(long.marks[0].note.length, NOTE_MAX_LENGTH);
  assert.ok(recordingSchema.safeParse(noted).success);
});

test('an empty note takes the note off; a flag that is not there takes none', () => {
  const recording = {
    ...rideRecording('id-1', rideFixes(5)),
    marks: [{ time: 1, note: 'Waiting shed' }],
  };
  assert.deepEqual(notedRecording(recording, 0, '   ').marks, [{ time: 1 }]);
  assert.equal(notedRecording(recording, 1, 'x'), null);
  assert.equal(notedRecording(recording, -1, 'x'), null);
  assert.equal(notedRecording({ ...recording, marks: undefined }, 0, 'x'), null);
});

test('a mark goes up with its note only when it has one', () => {
  assert.deepEqual(markEvent({ time: 5 }), { time: 5, kind: 'mark' });
  assert.deepEqual(markEvent({ time: 5, note: 'Corner' }), {
    time: 5,
    kind: 'mark',
    note: 'Corner',
  });
});

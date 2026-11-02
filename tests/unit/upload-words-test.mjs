// Every word the contributor page says about an upload, pinned literally, state by state: History's
// card (src/features/contribute/history/card-status.ts) beside the "Route recorded" toast
// (notices/route-recorded.ts), both worded in uploads/upload-words.ts; the questions History asks
// before deleting (history/delete-questions.ts); and the save's other toasts. A word changed by
// accident fails here.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/upload-words-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cardStatusOf } from '../../src/features/contribute/history/card-status.ts';
import {
  DELETE_ONLY_COPY_QUESTION,
  REMOVE_UPLOAD_QUESTION,
  deleteFromPhoneQuestion,
} from '../../src/features/contribute/history/delete-questions.ts';
import {
  pointsLostWords,
  routeRecordedWords,
} from '../../src/features/contribute/notices/route-recorded.ts';
import { uploadFailedProblem } from '../../src/features/contribute/notices/upload-failed-problem.ts';
import { FAILED } from '../../src/features/contribute/uploads/upload-failures.ts';

const failed = (reason) => ({ state: 'failed', ...FAILED[reason] });

const ON_ITS_WAY = 'Thanks! It’s on its way to Para.';
const SENDS_WHEN_ONLINE = 'Kept on this phone. It sends when you’re online.';
const KEPT = 'Kept on this phone.';

/**
 * Each state, with what its card says (online and offline, deletable from Para or not) and what
 * the toast says (online and offline). Card: [tone, words].
 */
const CASES = [
  {
    name: 'waiting',
    status: { state: 'waiting' },
    card: { online: ['quiet', 'Waiting to send'], offline: ['quiet', 'Waiting for signal'] },
    toast: { online: ON_ITS_WAY, offline: SENDS_WHEN_ONLINE },
  },
  {
    name: 'checking',
    status: { state: 'checking' },
    card: ['quiet', 'Sending…'],
    toast: ON_ITS_WAY,
  },
  {
    name: 'uploading',
    status: { state: 'uploading' },
    card: ['quiet', 'Sending…'],
    toast: ON_ITS_WAY,
  },
  {
    name: 'uploaded, deletable from Para',
    status: { state: 'uploaded', at: 1, by: 'p' },
    card: ['uploaded', 'Uploaded'],
    toast: ON_ITS_WAY,
  },
  {
    name: 'uploaded, by an earlier sign-in',
    status: { state: 'uploaded', at: 1, by: 'p' },
    canDeleteFromPara: false,
    card: ['uploaded', 'Uploaded from an earlier sign-in'],
    toast: ON_ITS_WAY,
  },
  {
    name: 'uploaded, its removal failed',
    status: { state: 'uploaded', at: 1, by: 'p', problem: 'Not removed' },
    card: ['problem', 'Not removed'],
    toast: ON_ITS_WAY,
  },
  {
    name: 'removing',
    status: { state: 'removing' },
    card: ['quiet', 'Removing…'],
    toast: KEPT,
  },
  {
    name: 'removed',
    status: { state: 'removed' },
    card: ['quiet', 'Only on this phone'],
    toast: KEPT,
  },
  {
    name: 'removed by an editor',
    status: { state: 'removed', byEditor: true },
    card: ['quiet', 'Removed by an editor'],
    toast: KEPT,
  },
  { name: 'held', status: { state: 'held' }, card: ['quiet', 'Only on this phone'], toast: KEPT },
  {
    name: 'unavailable',
    status: { state: 'unavailable' },
    card: ['quiet', 'Only on this phone'],
    toast: KEPT,
  },
];

/** Each failure: what its card says, and that its toast follows the signal as a waiting one does. */
const FAILED_CARDS = {
  offline: ['quiet', 'Waiting for signal'],
  'day-cap': ['quiet', '20 recordings sent today'],
  'signed-out': ['quiet', 'Signed out'],
  'not-accepting': ['quiet', "Para isn't taking uploads now"],
  refused: ['retry', 'Tap retry upload'],
  blocked: ['retry', 'Tap retry upload'],
  'check-failed': ['retry', 'Tap retry upload'],
  unavailable: ['retry', 'Tap retry upload'],
  'too-long': ['problem', 'Longer than 6 hours'],
  'line-too-large': ['problem', 'Too large to upload'],
};
for (const [reason, card] of Object.entries(FAILED_CARDS)) {
  CASES.push({
    name: `failed: ${reason}`,
    status: failed(reason),
    card,
    toast: { online: ON_ITS_WAY, offline: SENDS_WHEN_ONLINE },
  });
}

const onlineOrNot = (words, isOnline) =>
  Array.isArray(words) || typeof words === 'string'
    ? words
    : isOnline
      ? words.online
      : words.offline;

test('every failure reason is pinned', () => {
  assert.deepEqual(Object.keys(FAILED_CARDS).sort(), Object.keys(FAILED).sort());
});

for (const { name, status, canDeleteFromPara = true, card, toast } of CASES) {
  test(`${name}: History's card and the "Route recorded" toast`, () => {
    for (const isOnline of [true, false]) {
      const [tone, words] = onlineOrNot(card, isOnline);
      assert.deepEqual(cardStatusOf(status, canDeleteFromPara, isOnline), { tone, words });
      assert.deepEqual(routeRecordedWords(status, isOnline), {
        title: 'Route recorded',
        body: onlineOrNot(toast, isOnline),
      });
    }
  });
}

test('the questions History asks before deleting', () => {
  const kept = 'Remove this recording from this phone? The copy uploaded to Para stays.';
  const gone = 'Remove this recording from this phone? It will be gone for good.';
  const neverSent =
    'Remove this recording from this phone? It has not been uploaded, so it will be gone for good.';
  assert.equal(deleteFromPhoneQuestion({ state: 'uploaded', at: 1, by: 'p' }), kept);
  assert.equal(deleteFromPhoneQuestion({ state: 'removed' }), gone);
  assert.equal(deleteFromPhoneQuestion({ state: 'unavailable' }), gone);
  for (const status of [
    { state: 'waiting' },
    { state: 'checking' },
    { state: 'uploading' },
    { state: 'removing' },
    { state: 'held' },
    failed('refused'),
  ]) {
    assert.equal(deleteFromPhoneQuestion(status), neverSent, status.state);
  }
  assert.equal(
    REMOVE_UPLOAD_QUESTION,
    'Delete this recording from Para? The copy on this phone stays.',
  );
  assert.equal(
    DELETE_ONLY_COPY_QUESTION,
    "Delete this recording from Para? There's no copy on this phone, so it will be gone for good.",
  );
});

test('the save says the points it could not keep, and an upload that failed', () => {
  assert.equal(pointsLostWords(0), null);
  assert.deepEqual(pointsLostWords(1), {
    title: 'Part of the ride wasn’t kept',
    body: 'The phone couldn’t keep 1 point of this recording.',
  });
  assert.deepEqual(pointsLostWords(3), {
    title: 'Part of the ride wasn’t kept',
    body: 'The phone couldn’t keep 3 points of this recording.',
  });
  assert.equal(uploadFailedProblem({ state: 'uploading' }), null);
  assert.deepEqual(uploadFailedProblem(failed('refused')), {
    id: 'upload-failed',
    icon: 'warning',
    title: 'Upload didn’t go through',
    body: "Para's checks refused this recording. It stays on this phone.",
  });
});

// Delete account on the phone (src/features/contribute/api/account-deletion.ts): which recordings
// the phone forgets with the account, and what a retry does after an answer was lost.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/account-deletion-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  nextDeletionStep,
  recordingsToForget,
} from '../../src/features/contribute/api/account-deletion.ts';

const ME = '00000000-0000-0000-0000-0000000000a1';
const MY_ANON = '00000000-0000-0000-0000-0000000000c3';
const SOMEONE = '00000000-0000-0000-0000-0000000000b2';

const recording = (id, upload, status = 'saved') => ({ id, status, ...(upload ? { upload } : {}) });

test('every saved recording goes, sent or not, whoever sent it: nothing of the account stays', () => {
  const recordings = [
    recording('mine-sent', { state: 'uploaded', at: 1, by: ME }),
    // Sent by this phone's anonymous identity before signing in, then claimed: `by` was never rewritten.
    recording('claimed', { state: 'uploaded', at: 2, by: MY_ANON }),
    recording('never-sent'),
    recording('removed', { state: 'removed', at: 3 }),
    recording('removed-by-editor', { state: 'removed', at: 4, byEditor: true }),
    recording('theirs', { state: 'uploaded', at: 5, by: SOMEONE }),
    recording('unclaimed-anon', { state: 'uploaded', at: 6, by: MY_ANON }),
  ];
  assert.deepEqual(
    recordingsToForget(recordings).map((r) => r.id),
    [
      'mine-sent',
      'claimed',
      'never-sent',
      'removed',
      'removed-by-editor',
      'theirs',
      'unclaimed-anon',
    ],
  );
  assert.deepEqual(recordingsToForget([]), []);
});

test('a recording still under way (recording, paused, or on its form) is never deleted', () => {
  const recordings = [
    recording('riding', undefined, 'recording'),
    recording('on-the-form', undefined, 'stopped'),
    recording('saved-unsent'),
  ];
  assert.deepEqual(
    recordingsToForget(recordings).map((r) => r.id),
    ['saved-unsent'],
  );
});

test('signed in with nothing begun: ask Para', () => {
  assert.deepEqual(nextDeletionStep(ME, null), { kind: 'ask', accountId: ME, kept: null });
});

test('the answer was lost but the session is still there: ask again with what was kept', () => {
  // Para deleted the account; its answer never came. The retry asks again (Para answers an
  // account already gone as deleted).
  const kept = { accountId: ME };
  assert.deepEqual(nextDeletionStep(ME, kept), { kind: 'ask', accountId: ME, kept });
});

test('the answer was lost and the session is gone since: only the phone is left to clear', () => {
  const kept = { accountId: ME };
  assert.deepEqual(nextDeletionStep(null, kept), { kind: 'forget', deletion: kept });
});

test('a deletion kept for another account is not reused; nobody signed in and nothing begun is none', () => {
  const kept = { accountId: SOMEONE };
  assert.deepEqual(nextDeletionStep(ME, kept), { kind: 'ask', accountId: ME, kept: null });
  assert.deepEqual(nextDeletionStep(null, null), { kind: 'none' });
});

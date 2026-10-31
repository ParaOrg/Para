// Delete account on the phone (src/features/contribute/api/account-deletion.ts): which recordings
// go with the account, and what a retry does after an answer was lost.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/account-deletion-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  nextDeletionStep,
  recordingsOfAccount,
} from '../../src/features/contribute/api/account-deletion.ts';

const ME = '00000000-0000-0000-0000-0000000000a1';
const MY_ANON = '00000000-0000-0000-0000-0000000000c3';
const SOMEONE = '00000000-0000-0000-0000-0000000000b2';

const recording = (id, upload) => ({ id, ...(upload ? { upload } : {}) });

test("the account's uploads, the ones it claimed, unsent and removed ones go; another account's stay", () => {
  const recordings = [
    recording('mine-sent', { state: 'uploaded', at: 1, by: ME }),
    // Sent by this phone's anonymous identity before signing in, then claimed: `by` was never rewritten.
    recording('claimed', { state: 'uploaded', at: 2, by: MY_ANON }),
    recording('never-sent'),
    recording('removed', { state: 'removed', at: 3 }),
    recording('removed-by-editor', { state: 'removed', at: 4, byEditor: true }),
    recording('theirs', { state: 'uploaded', at: 5, by: SOMEONE }),
    // An anonymous identity's upload that was never claimed: still in Para under that identity.
    recording('unclaimed-anon', { state: 'uploaded', at: 6, by: MY_ANON }),
  ];
  const deletion = { accountId: ME, uploadIds: ['mine-sent', 'claimed'] };
  assert.deepEqual(
    recordingsOfAccount(recordings, deletion).map((r) => r.id),
    ['mine-sent', 'claimed', 'never-sent', 'removed', 'removed-by-editor'],
  );
  assert.deepEqual(recordingsOfAccount([], deletion), []);
});

test('signed in with nothing begun: read the uploads, then ask Para', () => {
  assert.deepEqual(nextDeletionStep(ME, null), { kind: 'ask', accountId: ME, kept: null });
});

test('the answer was lost but the session is still there: ask again with what was kept', () => {
  // Para deleted the account; its answer never came. The retry asks again (Para answers an
  // account already gone as deleted) and clears what the first try read.
  const kept = { accountId: ME, uploadIds: ['mine-sent', 'claimed'] };
  assert.deepEqual(nextDeletionStep(ME, kept), { kind: 'ask', accountId: ME, kept });
});

test('the answer was lost and the session is gone since: only the phone is left to clear', () => {
  const kept = { accountId: ME, uploadIds: ['claimed'] };
  assert.deepEqual(nextDeletionStep(null, kept), { kind: 'forget', deletion: kept });
});

test('a deletion kept for another account is not reused; nobody signed in and nothing begun is none', () => {
  const kept = { accountId: SOMEONE, uploadIds: ['theirs'] };
  assert.deepEqual(nextDeletionStep(ME, kept), { kind: 'ask', accountId: ME, kept: null });
  assert.deepEqual(nextDeletionStep(null, null), { kind: 'none' });
});

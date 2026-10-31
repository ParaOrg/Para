// Which of the phone's recordings go when its account is deleted
// (src/features/contribute/api/account-recordings.ts): every one, sent or not, but an upload made
// by another identity.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/account-recordings-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { recordingsOfAccount } from '../../src/features/contribute/api/account-recordings.ts';

const ME = '00000000-0000-0000-0000-0000000000a1';
const SOMEONE = '00000000-0000-0000-0000-0000000000b2';

const recording = (id, upload) => ({ id, ...(upload ? { upload } : {}) });

test("the account's uploads, unsent ones and removed ones go; another identity's upload stays", () => {
  const recordings = [
    recording('mine-sent', { state: 'uploaded', at: 1, by: ME }),
    recording('never-sent'),
    recording('removed', { state: 'removed', at: 2 }),
    recording('removed-by-editor', { state: 'removed', at: 3, byEditor: true }),
    recording('theirs', { state: 'uploaded', at: 4, by: SOMEONE }),
  ];
  assert.deepEqual(
    recordingsOfAccount(recordings, ME).map((r) => r.id),
    ['mine-sent', 'never-sent', 'removed', 'removed-by-editor'],
  );
});

test('a phone with nothing on it forgets nothing', () => {
  assert.deepEqual(recordingsOfAccount([], ME), []);
});

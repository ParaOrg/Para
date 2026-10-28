// What the contributor page decides about an upload before and after sending it
// (src/features/contribute/upload-rules.ts, upload-failures.ts): which recordings go on their own,
// where an upload stands by what the phone keeps, which still have to go, which an editor has
// removed from Para, and what an upload error stands for.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/upload-rules-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CONSENT_VERSION } from '../../src/features/contribute/consent-version.ts';
import { UploadError } from '../../src/features/contribute/api/upload-problem.ts';
import { FAILED, problemOfError } from '../../src/features/contribute/upload-failures.ts';
import {
  isGoneFromPara,
  isSentOnItsOwn,
  isWaitingToGo,
  storedUploadStatus,
} from '../../src/features/contribute/upload-rules.ts';

const consented = { hasConsent: true, earlier: null };
const current = (upload) => ({ id: 'ride-1', consentVersion: CONSENT_VERSION, upload });
const earlier = { id: 'ride-0', consentVersion: 1 };

test('nothing goes on its own without consent to the current text', () => {
  assert.equal(isSentOnItsOwn(current(), { hasConsent: false, earlier: 'send' }), false);
  assert.equal(isSentOnItsOwn(current(), consented), true);
});

test('a recording made before the current consent goes on its own only when the person said send', () => {
  assert.equal(isSentOnItsOwn(earlier, consented), false);
  assert.equal(isSentOnItsOwn(earlier, { hasConsent: true, earlier: 'keep' }), false);
  assert.equal(isSentOnItsOwn(earlier, { hasConsent: true, earlier: 'send' }), true);
  assert.equal(isSentOnItsOwn({ id: 'ride-x' }, { hasConsent: true, earlier: 'send' }), true);
});

test('the stored mark says an upload arrived or was removed, whatever the page can do', () => {
  const uploaded = { state: 'uploaded', at: 5, by: 'me' };
  assert.deepEqual(storedUploadStatus(current(uploaded), false, consented), uploaded);
  assert.deepEqual(storedUploadStatus(current({ state: 'removed', at: 6 }), true, consented), {
    state: 'removed',
    byEditor: false,
  });
  assert.deepEqual(
    storedUploadStatus(current({ state: 'removed', at: 6, byEditor: true }), true, consented),
    { state: 'removed', byEditor: true },
  );
});

test('with no mark it is unavailable, waiting, or held on the phone', () => {
  assert.deepEqual(storedUploadStatus(current(), false, consented), { state: 'unavailable' });
  assert.deepEqual(storedUploadStatus(current(), true, consented), { state: 'waiting' });
  assert.deepEqual(storedUploadStatus(earlier, true, consented), { state: 'held' });
});

test('waiting, checking, uploading and failed still have to go; the rest do not', () => {
  for (const state of ['waiting', 'checking', 'uploading', 'failed']) {
    assert.equal(isWaitingToGo({ state }), true, state);
  }
  for (const state of ['uploaded', 'removing', 'removed', 'held', 'unavailable']) {
    assert.equal(isWaitingToGo({ state }), false, state);
  }
});

test('an upload is gone from Para only when this identity made it and Para no longer has it', () => {
  const mine = current({ state: 'uploaded', at: 5, by: 'me' });
  assert.equal(isGoneFromPara(mine, 'me', new Set()), true);
  assert.equal(isGoneFromPara(mine, 'me', new Set(['ride-1'])), false);
  assert.equal(isGoneFromPara(mine, 'someone-else', new Set()), false);
  assert.equal(isGoneFromPara(current(), 'me', new Set()), false);
  assert.equal(isGoneFromPara(current({ state: 'removed', at: 6 }), 'me', new Set()), false);
});

test('an upload error stands for its own problem, and anything else for no signal', () => {
  assert.equal(problemOfError(new UploadError('day-cap', 'too many')), 'day-cap');
  assert.equal(problemOfError(new Error('network')), 'offline');
  assert.equal(problemOfError('nope'), 'offline');
});

test('every failure has a sentence and a brief reason, and only passing ones are tried again', () => {
  const retried = Object.keys(FAILED).filter((reason) => FAILED[reason].willRetry);
  assert.deepEqual(retried.sort(), ['day-cap', 'not-accepting', 'offline']);
  for (const failure of Object.values(FAILED)) {
    assert.ok(failure.message.length > 0 && failure.brief.length > 0);
  }
});

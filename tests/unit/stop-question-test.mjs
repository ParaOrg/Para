// ✕'s question on the recording screen (src/features/contribute/screens/stop-question.ts): shown
// once the pause it asked for lands, and dropped as the page leaves the recording screen.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/stop-question-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isStopQuestionShown,
  stopQuestionIn,
} from '../../src/features/contribute/screens/stop-question.ts';

test('asked while recording, it shows only once the pause lands', () => {
  assert.equal(isStopQuestionShown('recording', 'recording'), false);
  assert.equal(isStopQuestionShown('paused', 'recording'), true);
  assert.equal(isStopQuestionShown('paused', 'paused'), true);
  assert.equal(isStopQuestionShown('paused', null), false);
});

test('it holds while the recording screen does', () => {
  assert.equal(stopQuestionIn('recording', 'recording'), 'recording');
  assert.equal(stopQuestionIn('paused', 'paused'), 'paused');
});

test('a Finish that swallowed the pause lands on the form, and the question goes with it', () => {
  // ✕ after Finish in the app: the stop is dropped while the native read waits, and the form comes.
  let askedWhile = stopQuestionIn('recording', 'recording');
  for (const phase of ['form', 'recording', 'paused']) {
    askedWhile = stopQuestionIn(phase, askedWhile);
    // Keep recording on the form, then Pause: the question must not come back unasked.
    assert.equal(isStopQuestionShown(phase, askedWhile), false, phase);
  }
  assert.equal(askedWhile, null);
});

test('nor does it carry into the next ride after the form is left', () => {
  for (const phase of ['ready', 'saved', 'unfinished', 'loading']) {
    assert.equal(stopQuestionIn(phase, 'recording'), null, phase);
  }
});

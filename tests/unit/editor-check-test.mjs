// The studio's editor check at sign-in: what am_i_editor's answer means
// (readEditorAnswer), where the account stands (editorStatusOf), and the
// session the studio may use (editorSessionOf). A non-editor's account never
// reaches the workshop. Only a missing function or no response lets an account
// in without a yes; a refusal or anything else keeps it out.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/editor-check-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { editorSessionOf, editorStatusOf } from '../../src/features/studio/auth/editor-status.ts';
import { readEditorAnswer } from '../../src/features/studio/data/editor-check.ts';

test('a yes or no from the database is the answer, with nothing to log', () => {
  assert.deepEqual(readEditorAnswer(true, null), { isEditor: true, problem: null });
  assert.deepEqual(readEditorAnswer(false, null), { isEditor: false, problem: null });
});

test('the function missing (not applied yet) lets the account in, with a warning', () => {
  for (const error of [
    { message: 'Could not find the function public.am_i_editor', code: 'PGRST202', status: 404 },
    { message: 'Not Found', status: 404 },
  ]) {
    const answer = readEditorAnswer(null, error);
    assert.equal(answer.isEditor, true, JSON.stringify(error));
    assert.equal(answer.problem.level, 'warn');
  }
});

test('no response (offline, a 5xx, the request threw) lets the account in, with a warning', () => {
  for (const error of [
    { message: 'TypeError: Failed to fetch', code: '', status: 0 },
    { message: 'Bad gateway', status: 502 },
    { message: 'Service unavailable', code: '', status: 503 },
    { message: 'the request failed' },
  ]) {
    const answer = readEditorAnswer(null, error);
    assert.equal(answer.isEditor, true, JSON.stringify(error));
    assert.equal(answer.problem.level, 'warn');
  }
});

test('a refusal (401, 403, 42501) is not an editor, with an error', () => {
  for (const error of [
    { message: 'JWT expired', code: 'PGRST301', status: 401 },
    { message: 'permission denied for function am_i_editor', code: '42501', status: 403 },
    { message: 'permission denied', code: '42501', status: 400 },
    { message: 'Forbidden', status: 403 },
  ]) {
    const answer = readEditorAnswer(null, error);
    assert.equal(answer.isEditor, false, JSON.stringify(error));
    assert.equal(answer.problem.level, 'error');
  }
});

test('any other error, or an answer that is not a yes or no, is not an editor', () => {
  assert.equal(
    readEditorAnswer(null, { message: 'bad request', code: 'PGRST100', status: 400 }).isEditor,
    false,
  );
  for (const odd of [null, 'true', 1, { am_i_editor: false }, [false]]) {
    const answer = readEditorAnswer(odd, null);
    assert.equal(answer.isEditor, false, JSON.stringify(odd));
    assert.equal(answer.problem.level, 'error');
  }
});

test('the status is about the account signed in now', () => {
  assert.equal(editorStatusOf(null, null), 'signed-out');
  assert.equal(editorStatusOf(null, { userId: 'a', isEditor: false }), 'signed-out');
  assert.equal(editorStatusOf('a', null), 'checking');
  assert.equal(editorStatusOf('b', { userId: 'a', isEditor: true }), 'checking');
  assert.equal(editorStatusOf('a', { userId: 'a', isEditor: true }), 'editor');
  assert.equal(editorStatusOf('a', { userId: 'a', isEditor: false }), 'not-editor');
});

test("only an editor's session reaches the studio", () => {
  const session = { user: { id: 'a' } };
  assert.equal(editorSessionOf(session, 'editor'), session);
  assert.equal(editorSessionOf(session, 'not-editor'), null);
  assert.equal(editorSessionOf(session, 'checking'), undefined, 'still asking: nothing yet');
  assert.equal(editorSessionOf(undefined, 'signed-out'), undefined, 'still restoring');
  assert.equal(editorSessionOf(null, 'signed-out'), null);
});

// The studio's editor check at sign-in: what am_i_editor's answer means
// (readEditorAnswer), where the account stands (editorStatusOf), and the
// session the studio may use (editorSessionOf). A non-editor's account never
// reaches the workshop; "can't tell" lets the account in, as before the check.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/editor-check-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { editorSessionOf, editorStatusOf } from '../../src/features/studio/auth/editor-status.ts';
import { readEditorAnswer } from '../../src/features/studio/data/editor-check.ts';

test('a yes or no from the database is the answer, with no warning', () => {
  assert.deepEqual(readEditorAnswer(true, null), { isEditor: true, warning: null });
  assert.deepEqual(readEditorAnswer(false, null), { isEditor: false, warning: null });
});

test("can't tell lets the account in, and says why", () => {
  const missing = readEditorAnswer(null, {
    message:
      'Could not find the function public.am_i_editor without parameters in the schema cache',
  });
  assert.equal(missing.isEditor, true);
  assert.match(missing.warning, /am_i_editor/);
  for (const odd of [null, 'true', 1, { am_i_editor: false }, [false]]) {
    const answer = readEditorAnswer(odd, null);
    assert.equal(answer.isEditor, true, JSON.stringify(odd));
    assert.ok(answer.warning);
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

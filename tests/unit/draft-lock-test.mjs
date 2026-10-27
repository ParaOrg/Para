import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  OTHER_EDITOR,
  editorNameOf,
  isAnothersDraft,
  lockMessage,
  lockRefusal,
} from '../../src/features/studio/data/draft-lock.ts';

const draft = (editor_id) => ({ editor_id });

test("a draft is another editor's only when it has a maker who is not the signed-in editor", () => {
  assert.equal(isAnothersDraft(draft('a'), 'b'), true);
  assert.equal(isAnothersDraft(draft('a'), 'a'), false);
  assert.equal(isAnothersDraft(draft(null), 'a'), false);
  assert.equal(isAnothersDraft(null, 'a'), false);
});

test('the maker is called by the name on file, or by plain words', () => {
  const names = new Map([
    ['a', 'Marisol'],
    ['blank', ''],
  ]);
  assert.equal(editorNameOf(names, 'a'), 'Marisol');
  assert.equal(editorNameOf(names, 'blank'), null);
  assert.equal(editorNameOf(names, 'missing'), null);
  assert.equal(editorNameOf(names, null), null);
});

test('the notice names the editor, and never shows an id when there is no name', () => {
  assert.match(lockMessage({ state: 'other', name: 'Marisol' }), /^Being changed by Marisol\./);
  const plain = lockMessage({ state: 'other', name: null });
  assert.ok(plain.includes(OTHER_EDITOR));
  assert.ok(!/[0-9a-f]{8}-/.test(plain));
  assert.match(lockRefusal('Marisol'), /being changed by Marisol/);
  assert.match(lockRefusal(null), /another editor/);
  assert.match(lockMessage({ state: 'checking' }), /Checking/);
  assert.match(lockMessage({ state: 'unknown' }), /Could not check/);
});

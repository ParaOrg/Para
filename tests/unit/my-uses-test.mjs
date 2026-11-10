// get_my_uses' rows, grouped by ride for History's cards.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { myUsesOf } from '../../src/features/contribute/api/fetch-my-uses.ts';

test('groups names by ride and drops repeats', () => {
  const uses = myUsesOf([
    { contribution_id: 'a', kind: 'direction', name: 'SM Fairview → Cubao' },
    { contribution_id: 'a', kind: 'hintuan', name: 'Philcoa' },
    { contribution_id: 'a', kind: 'direction', name: 'SM Fairview → Cubao' },
    { contribution_id: 'b', kind: 'direction', name: 'Cubao → SM Fairview' },
  ]);
  assert.deepEqual(uses.get('a'), ['SM Fairview → Cubao', 'Philcoa']);
  assert.deepEqual(uses.get('b'), ['Cubao → SM Fairview']);
  assert.equal(uses.get('c'), undefined);
});

test('rows not in the form expected are no uses', () => {
  assert.equal(myUsesOf(null).size, 0);
  assert.equal(myUsesOf([{ contribution_id: 1 }]).size, 0);
});

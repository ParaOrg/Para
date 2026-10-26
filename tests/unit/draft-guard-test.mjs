import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertNotAnothersDraft } from '../../src/features/studio/data/draft-guard.ts';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';

const draft = (editor_id) => ({ editor_id });

/** A client that is signed in as `userId` and whose editor_name table answers `rows` (or fails). */
const clientAs = (userId, rows) => {
  const answer = rows
    ? { data: rows, count: rows.length, error: null }
    : { data: null, count: null, error: { message: 'no access' } };
  const query = { select: () => query, order: () => query, range: () => Promise.resolve(answer) };
  setSupabase({
    auth: {
      getSession: async () => ({ data: { session: { user: { id: userId } } }, error: null }),
    },
    from: () => query,
  });
};

test('a save on no draft, or on your own, goes ahead', async () => {
  clientAs('a', []);
  await assertNotAnothersDraft(null);
  await assertNotAnothersDraft(draft('a'));
  await assertNotAnothersDraft(draft(null));
});

test("a save on another editor's draft is refused, naming them", async () => {
  clientAs('b', [{ user_id: 'a', name: 'Marisol' }]);
  await assert.rejects(assertNotAnothersDraft(draft('a')), /being changed by Marisol/);
});

test('with no name on file, or the names unreadable, the refusal says another editor and no id', async () => {
  for (const rows of [[], null]) {
    clientAs('b', rows);
    await assert.rejects(assertNotAnothersDraft(draft('a-1234-id')), (error) => {
      assert.match(error.message, /another editor/);
      assert.ok(!error.message.includes('a-1234-id'));
      return true;
    });
  }
});

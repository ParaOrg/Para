// Each route's and hotspot's Author, Date published and Last edited
// (src/features/studio/data/edit-stamps.ts, fetchEditStamps) against a fake client.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/edit-stamps-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import { fetchEditStamps } from '../../src/features/studio/data/edit-stamps.ts';

const ANA = 'ana-id';
const BEN = 'ben-id';
const NAMELESS = 'nameless-id';

/** A client whose tables answer `rows[table]`, each in one page. */
function answering(rows) {
  const fake = fakeSupabase((q) => {
    const data = rows[q.table];
    if (!data) throw new Error(`unexpected ${q.op} on ${q.table}`);
    return { data, count: data.length };
  });
  setSupabase(fake.client);
  return fake;
}

const row = (id, over = {}) => ({
  id,
  status: 'approved',
  published_at: '2026-11-01T00:00:00Z',
  last_saved_at: '2026-10-31T00:00:00Z',
  last_saved_by: ANA,
  ...over,
});
const draft = (kind, subjectId, over = {}) => ({
  kind,
  subject_id: subjectId,
  updated_at: '2026-11-05T08:00:00Z',
  editor_id: BEN,
  last_saved_by: BEN,
  ...over,
});
const names = [
  { user_id: ANA, name: 'Ana ' },
  { user_id: BEN, name: 'Ben' },
];

test('a published route with no draft: its row says who saved it, when, and when it was published', async () => {
  answering({ route: [row('r1')], stop: [], draft: [], editor_name: names });
  const { routes } = await fetchEditStamps();
  assert.deepEqual(routes.get('r1'), {
    kind: 'route',
    id: 'r1',
    isPublished: true,
    hasDraft: false,
    authorId: ANA,
    authorName: 'Ana',
    publishedAt: '2026-11-01T00:00:00Z',
    lastEditedAt: '2026-10-31T00:00:00Z',
  });
});

test("a published route with a draft of its next change: the draft's saver and save, the row's publish date", async () => {
  answering({ route: [row('r1')], stop: [], draft: [draft('route', 'r1')], editor_name: names });
  const stamp = (await fetchEditStamps()).routes.get('r1');
  assert.equal(stamp.isPublished, true);
  assert.equal(stamp.hasDraft, true);
  assert.equal(stamp.authorName, 'Ben');
  assert.equal(stamp.lastEditedAt, '2026-11-05T08:00:00Z');
  assert.equal(stamp.publishedAt, '2026-11-01T00:00:00Z');
});

test('an unpublished hotspot is a draft, not published, and keeps its last publish date', async () => {
  answering({
    route: [],
    stop: [row('h1', { status: 'taken_down' })],
    draft: [draft('hotspot', 'h1', { last_saved_by: ANA, updated_at: '2026-10-31T00:00:00Z' })],
    editor_name: names,
  });
  const stamp = (await fetchEditStamps()).hotspots.get('h1');
  assert.equal(stamp.isPublished, false);
  assert.equal(stamp.hasDraft, true);
  assert.equal(stamp.authorName, 'Ana');
  assert.equal(stamp.publishedAt, '2026-11-01T00:00:00Z');
});

test('a new route that exists only as a draft is listed, never published', async () => {
  answering({ route: [], stop: [], draft: [draft('route', 'new-r')], editor_name: names });
  const { routes, hotspots } = await fetchEditStamps();
  assert.deepEqual(routes.get('new-r'), {
    kind: 'route',
    id: 'new-r',
    isPublished: false,
    hasDraft: true,
    authorId: BEN,
    authorName: 'Ben',
    publishedAt: null,
    lastEditedAt: '2026-11-05T08:00:00Z',
  });
  assert.equal(hotspots.size, 0, "a route's draft is not a hotspot");
});

test('an author with no name on file has no name; a draft saved before last_saved_by names its maker', async () => {
  answering({
    route: [row('r1', { last_saved_by: NAMELESS })],
    stop: [],
    draft: [draft('hotspot', 'h-new', { last_saved_by: null, editor_id: ANA })],
    editor_name: names,
  });
  const { routes, hotspots } = await fetchEditStamps();
  assert.equal(routes.get('r1').authorId, NAMELESS);
  assert.equal(routes.get('r1').authorName, null);
  assert.equal(hotspots.get('h-new').authorName, 'Ana');
});

test('every table is read whole, in a stable order, and a row that does not parse is an error', async () => {
  const { log } = answering({
    route: [row('r1')],
    stop: [row('h1')],
    draft: [],
    editor_name: names,
  });
  await fetchEditStamps();
  for (const table of ['route', 'stop', 'draft']) {
    const read = log.find((q) => q.table === table);
    assert.equal(read.op, 'select');
    assert.deepEqual(read.options, { count: 'exact' });
  }
  answering({ route: [{ id: 'r1', status: 'approved' }], stop: [], draft: [], editor_name: names });
  await assert.rejects(fetchEditStamps());
});

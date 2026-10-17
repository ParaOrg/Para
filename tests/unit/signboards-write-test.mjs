// The signboards a direction's editor writes (src/features/studio/data/signboards.ts):
// the file sent to the `signboards` bucket and the direction's `signboards`
// column listing it, against a fake client that records both.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/signboards-write-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import {
  addSignboard,
  moveSignboardEarlier,
  removeSignboard,
} from '../../src/features/studio/data/signboards.ts';

const UPLOADED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.svg$/;
const DIRTY_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><script>alert(1)</script><rect width="4" height="4" fill="red"/></svg>';
/** What the cleaner leaves of DIRTY_SVG: the drawing only. */
const CLEAN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="4" height="4" fill="red"/></svg>';
const file = (name, text = DIRTY_SVG, type = 'image/svg+xml') => new File([text], name, { type });

/** A client that lists whatever it is given back, and notes the order of everything it hears. */
function echoing(order) {
  const fake = fakeSupabase((q) => {
    order.push(`${q.table} ${q.op}`);
    if (q.table === 'route_variant' && q.op === 'update')
      return { data: { signboards: q.payload.signboards } };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  const uploaded = fake.storage.uploaded;
  fake.storage.uploaded = (path) => {
    order.push('storage upload');
    return uploaded(path);
  };
  const removed = fake.storage.removed;
  fake.storage.removed = (paths) => {
    order.push('storage remove');
    return removed(paths);
  };
  return fake;
}

test('a board is cleaned, sent to the signboards bucket as an SVG, and only then listed last', async () => {
  const order = [];
  const { client, log, storage } = echoing(order);
  setSupabase(client);
  const list = await addSignboard('v1', ['old.svg'], file('jeep.svg'));
  assert.equal(storage.calls.length, 1);
  const [sent] = storage.calls;
  assert.equal(sent.bucket, 'signboards');
  assert.equal(sent.op, 'upload');
  assert.match(sent.path, UPLOADED_NAME);
  assert.equal(sent.body.type, 'image/svg+xml');
  assert.equal(await sent.body.text(), CLEAN_SVG);
  assert.deepEqual(sent.options, { contentType: 'image/svg+xml', upsert: false });
  assert.deepEqual(order, ['storage upload', 'route_variant update']);
  assert.deepEqual(log[0].payload, { signboards: ['old.svg', sent.path] });
  assert.deepEqual(log[0].filters, [['eq', 'id', 'v1']]);
  assert.equal(log[0].select, 'signboards');
  assert.equal(log[0].single, true);
  assert.deepEqual(list, ['old.svg', sent.path]);
});

test('each board gets a fresh name, whatever the file was called', async () => {
  const { client, storage } = echoing([]);
  setSupabase(client);
  await addSignboard('v1', [], file('same.svg'));
  await addSignboard('v1', [], file('same.svg'));
  assert.notEqual(storage.calls[0].path, storage.calls[1].path);
});

test('a file that is not an SVG by name or type is refused before anything is sent', async () => {
  const { client, log, storage } = echoing([]);
  setSupabase(client);
  await assert.rejects(
    addSignboard('v1', [], file('board.png', DIRTY_SVG, 'image/png')),
    /board\.png is not an SVG file\./,
  );
  assert.equal(storage.calls.length + log.length, 0);
  // An .svg name is enough without a type, and an SVG type without the extension.
  await addSignboard('v1', [], file('plain.SVG', DIRTY_SVG, ''));
  await addSignboard('v1', [], file('typed', DIRTY_SVG, 'image/svg+xml'));
  assert.equal(storage.calls.length, 2);
});

test("a board the cleaner refuses is named with the cleaner's words and nothing is sent", async () => {
  const { client, log, storage } = echoing([]);
  setSupabase(client);
  await assert.rejects(
    addSignboard('v1', [], file('bad.svg', 'not svg')),
    /bad\.svg: Not an SVG file: there is text outside the drawing\./,
  );
  assert.equal(storage.calls.length + log.length, 0);
});

test('an upload the bucket refuses is said with the file name, and the list is left alone', async () => {
  const { client, log, storage } = echoing([]);
  storage.uploaded = () => ({ error: { message: 'bucket full' } });
  setSupabase(client);
  await assert.rejects(
    addSignboard('v1', ['old.svg'], file('jeep.svg')),
    /jeep\.svg was not uploaded: bucket full/,
  );
  assert.equal(log.length, 0);
});

test('a list the database refuses is said, after the file went up', async () => {
  const { client, storage } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { error: { message: 'denied' } };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(
    addSignboard('v1', [], file('jeep.svg')),
    /The signboards were not saved: denied/,
  );
  assert.equal(storage.calls.length, 1);
});

test('a board is unlisted first and its file deleted after', async () => {
  const order = [];
  const { client, log, storage } = echoing(order);
  setSupabase(client);
  const list = await removeSignboard('v1', ['a.svg', 'b.svg', 'c.svg'], 'b.svg');
  assert.deepEqual(log[0].payload, { signboards: ['a.svg', 'c.svg'] });
  assert.deepEqual(log[0].filters, [['eq', 'id', 'v1']]);
  assert.deepEqual(storage.calls, [{ bucket: 'signboards', op: 'remove', paths: ['b.svg'] }]);
  assert.deepEqual(order, ['route_variant update', 'storage remove']);
  assert.deepEqual(list, ['a.svg', 'c.svg']);
});

test('a board whose unlisting is refused keeps its file', async () => {
  const { client, storage } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { error: { message: 'denied' } };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(
    removeSignboard('v1', ['a.svg'], 'a.svg'),
    /The signboards were not saved: denied/,
  );
  assert.equal(storage.calls.length, 0);
});

test('a board moves one place earlier, swapping with the one before it', async () => {
  const { client, log } = echoing([]);
  setSupabase(client);
  const list = await moveSignboardEarlier('v1', ['a.svg', 'b.svg', 'c.svg'], 'c.svg');
  assert.deepEqual(log[0].payload, { signboards: ['a.svg', 'c.svg', 'b.svg'] });
  assert.deepEqual(log[0].filters, [['eq', 'id', 'v1']]);
  assert.deepEqual(list, ['a.svg', 'c.svg', 'b.svg']);
});

test('the first board, or one not listed, does not move and writes nothing', async () => {
  const { client, log } = echoing([]);
  setSupabase(client);
  const current = ['a.svg', 'b.svg'];
  assert.deepEqual(await moveSignboardEarlier('v1', current, 'a.svg'), ['a.svg', 'b.svg']);
  assert.deepEqual(await moveSignboardEarlier('v1', current, 'gone.svg'), ['a.svg', 'b.svg']);
  assert.equal(log.length, 0);
});

test('with no client the editor says Supabase is not configured', async () => {
  setSupabase(null);
  await assert.rejects(addSignboard('v1', [], file('jeep.svg')), /Supabase is not configured\./);
  await assert.rejects(removeSignboard('v1', ['a.svg'], 'a.svg'), /Supabase is not configured\./);
  await assert.rejects(
    moveSignboardEarlier('v1', ['a.svg', 'b.svg'], 'b.svg'),
    /Supabase is not configured\./,
  );
});

test("the list that comes back is the database's, not the one that was sent", async () => {
  const { client } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update')
      return { data: { signboards: ['db-a.svg', 'db-b.svg'] } };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  assert.deepEqual(await addSignboard('v1', ['old.svg'], file('jeep.svg')), [
    'db-a.svg',
    'db-b.svg',
  ]);
  assert.deepEqual(await removeSignboard('v1', ['a.svg'], 'a.svg'), ['db-a.svg', 'db-b.svg']);
  assert.deepEqual(await moveSignboardEarlier('v1', ['a.svg', 'b.svg'], 'b.svg'), [
    'db-a.svg',
    'db-b.svg',
  ]);
});

test('a file the bucket would not delete is left behind and the new list is still returned', async () => {
  const { client, storage } = echoing([]);
  storage.removed = () => ({ error: { message: 'bucket busy' } });
  setSupabase(client);
  const list = await removeSignboard('v1', ['a.svg', 'b.svg'], 'a.svg');
  assert.deepEqual(list, ['b.svg']);
  assert.equal(storage.calls.length, 1);
});

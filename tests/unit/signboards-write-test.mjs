// The signboards a direction's editor writes (src/features/studio/data/signboards.ts):
// the file sent to the `signboards` bucket, and the list stored in the route's
// draft (claim_draft), against a fake client that records both. The approved
// row's `signboards` column is never written: approval does that.
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

/** The approved route and its two directions, as the draft is built from them. */
const ROUTE = {
  id: 'r',
  revision: 3,
  route_code: null,
  signboard: 'Tala',
  mode: 'jeepney',
  fare_note: null,
  via: null,
  head_stop_id: 'tala',
  tail_stop_id: 'fairview',
  is_loop: false,
};
const LINE = [
  [121.04, 14.7],
  [121.05, 14.7],
];
const direction = (id, reversed, signboards) => ({
  id,
  reversed,
  direction_name: null,
  origin_terminal: null,
  destination_terminal: null,
  control_points: LINE,
  segments: [],
  shape: { type: 'LineString', coordinates: LINE },
  overview: null,
  confidence: 'drawn',
  borrowed_from: null,
  borrowed_part: null,
  borrowed_m: null,
  signboards,
});

/**
 * A client with no draft of the route yet, that claims one for whatever it is
 * given, or refuses the claim with `refusal`, and notes the order of
 * everything it hears.
 */
function echoing(order, refusal = null) {
  const fake = fakeSupabase((q) => {
    order.push(`${q.table} ${q.op}`);
    if (q.table === 'route_variant' && q.filters.some((f) => f[1] === 'id'))
      return { data: { route_id: 'r' } };
    if (q.table === 'route_variant') return { data: [direction('v1', false, ['old.svg'])] };
    if (q.table === 'route') return { data: ROUTE };
    if (q.table === 'route_stop') return { data: [], count: 0 };
    if (q.table === 'draft') return { data: null };
    if (q.table === 'rpc' && q.op === 'claim_draft')
      return refusal ? { error: { message: refusal } } : { data: claimedFrom(q) };
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

/** claim_draft's answer: a new draft holding what was sent. */
const claimedFrom = (q) => ({
  code: 'ok',
  created: true,
  draft: {
    id: 'd',
    kind: q.payload.p_kind,
    subject_id: q.payload.p_subject_id,
    is_new: q.payload.p_is_new,
    base_revision: q.payload.p_base_revision,
    revision: 1,
    status: 'draft',
    payload: q.payload.p_payload,
    note: q.payload.p_note ?? null,
    editor_id: null,
    created_at: '',
    updated_at: '',
    submitted_at: null,
  },
});

/** The list the claim stored for direction `v1`. */
const storedList = (log) =>
  log.find((q) => q.op === 'claim_draft').payload.p_payload.directions.find((d) => d.id === 'v1')
    .signboards;
/** Every write to the approved tables a log holds: a signboard change has none. */
const approvedWrites = (log) =>
  log.filter((q) => ['route', 'route_variant'].includes(q.table) && q.op !== 'select');

test('a board is cleaned, sent to the signboards bucket as an SVG, and only then listed last in the draft', async () => {
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
  assert.equal(order[0], 'storage upload');
  assert.equal(order.at(-1), 'rpc claim_draft');
  assert.deepEqual(storedList(log), ['old.svg', sent.path]);
  assert.deepEqual(approvedWrites(log), []);
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

test('a list the draft refuses is said, after the file went up', async () => {
  const { client, storage } = echoing([], 'denied');
  setSupabase(client);
  await assert.rejects(addSignboard('v1', [], file('jeep.svg')), /denied/);
  assert.equal(storage.calls.length, 1);
});

test("a board is taken off the draft's list, and its file is left in the bucket", async () => {
  const { client, log, storage } = echoing([]);
  setSupabase(client);
  const list = await removeSignboard('v1', ['a.svg', 'b.svg', 'c.svg'], 'b.svg');
  assert.deepEqual(storedList(log), ['a.svg', 'c.svg']);
  // The approved row still names it until approval; once approved it is an unlisted file.
  assert.deepEqual(storage.calls, []);
  assert.deepEqual(approvedWrites(log), []);
  assert.deepEqual(list, ['a.svg', 'c.svg']);
});

test('a board whose unlisting is refused is said in words', async () => {
  const { client, storage } = echoing([], 'denied');
  setSupabase(client);
  await assert.rejects(removeSignboard('v1', ['a.svg'], 'a.svg'), /denied/);
  assert.equal(storage.calls.length, 0);
});

test('a board moves one place earlier, swapping with the one before it', async () => {
  const { client, log } = echoing([]);
  setSupabase(client);
  const list = await moveSignboardEarlier('v1', ['a.svg', 'b.svg', 'c.svg'], 'c.svg');
  assert.deepEqual(storedList(log), ['a.svg', 'c.svg', 'b.svg']);
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

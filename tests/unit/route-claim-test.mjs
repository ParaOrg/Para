// The studio's direction save when its route's ends are taken
// (src/features/studio/data/routes-write.ts, claimExistingRoute and the read-backs)
// against a fake client: what a claimed route is filled with, and what is refused in words.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/route-claim-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import { saveDirection } from '../../src/features/studio/data/routes-write.ts';

const LINE = [
  [121.04, 14.7],
  [121.05, 14.7],
];
const input = {
  routeId: null,
  directionId: null,
  signboard: '',
  mode: 'jeepney',
  fareNote: '',
  headHotspotId: 'tala',
  tailHotspotId: 'fairview',
  via: '',
  reversed: false,
  controlPoints: LINE,
  segments: [{ mode: 'freehand', coordinates: LINE }],
  borrowedFrom: null,
  borrowedPart: null,
  borrowedMetres: null,
};
const refused = { code: '23505', message: 'duplicate key value violates unique constraint' };

/** A route_variant row as the list reads it back (DIRECTION_SELECT), whole: the boundary parses what comes back. */
const listed = (over) => ({
  id: 'v',
  route_id: 'r',
  owner_id: 'o',
  direction_name: null,
  origin_terminal: null,
  destination_terminal: null,
  overview: null,
  reversed: false,
  confidence: 'drawn',
  updated_at: '2026-10-07T00:00:00Z',
  borrowed_from: null,
  borrowed_part: null,
  borrowed_m: null,
  signboards: [],
  route: {
    id: 'r',
    owner_id: 'o',
    signboard: null,
    route_code: null,
    short_name: null,
    long_name: null,
    mode: 'jeepney',
    fare_note: null,
    fare_as_of: null,
    head_stop_id: 'tala',
    tail_stop_id: 'fairview',
    via: null,
  },
  ...over,
});

/** The route table refuses the insert (the ends are taken) and answers the read of the claimed route. */
function claiming(claimed, rest = () => undefined) {
  return fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { error: refused };
    if (q.table === 'route' && q.op === 'select') return claimed;
    return rest(q) ?? Promise.reject(new Error(`unexpected ${q.op} on ${q.table}`));
  });
}

test("a claimed route whose slot is this way is filled by the claimed route's id, its facts left alone", async () => {
  const { client, log } = claiming(
    { data: { id: 'r4', route_variant: [{ id: 'v9', reversed: false, shape: null }] } },
    (q) => {
      if (q.table === 'route_variant' && q.op === 'update')
        return { data: listed({ id: 'v9', route_id: 'r4' }) };
    },
  );
  setSupabase(client);
  const saved = await saveDirection({ ...input, signboard: 'ignored here' });
  assert.equal(saved.id, 'v9');
  assert.deepEqual(
    log.map((q) => `${q.table} ${q.op}`),
    ['route insert', 'route select', 'route_variant update'],
  );
  const fill = log[2];
  assert.deepEqual(fill.filters, [
    ['eq', 'route_id', 'r4'],
    ['eq', 'reversed', false],
    ['is', 'shape', null],
  ]);
  assert.equal(fill.payload.route_id, 'r4');
  assert.equal(fill.payload.reversed, false);
  assert.deepEqual(fill.payload.shape, { type: 'LineString', coordinates: LINE });
});

test('a claimed route with this way already drawn is refused in words, and writes nothing more', async () => {
  const { client, log } = claiming({
    data: {
      id: 'r4',
      route_variant: [
        { id: 'v9', reversed: false, shape: { type: 'LineString', coordinates: LINE } },
      ],
    },
  });
  setSupabase(client);
  await assert.rejects(
    saveDirection(input),
    /A route between these two places already has this direction drawn\. To change it, open it and press Edit route\./,
  );
  assert.deepEqual(
    log.map((q) => `${q.table} ${q.op}`),
    ['route insert', 'route select'],
  );
});

test('a claimed route that cannot be read back says the ends exist but it could not be read', async () => {
  const { client } = claiming({ data: null });
  setSupabase(client);
  await assert.rejects(
    saveDirection(input),
    /A route with these ends already exists, but it could not be read back\./,
  );
});

test("the read of the claimed route being refused is thrown with the database's words", async () => {
  const { client, log } = claiming({ error: { message: 'select denied' } });
  setSupabase(client);
  await assert.rejects(saveDirection(input), /select denied/);
  assert.equal(log.length, 2);
});

test('the facts of an orphan being refused stops the save before any direction is written', async () => {
  const { client, log } = claiming({ data: { id: 'r6', route_variant: [] } }, (q) => {
    if (q.table === 'route' && q.op === 'update') return { error: { message: 'update denied' } };
  });
  setSupabase(client);
  await assert.rejects(saveDirection(input), /update denied/);
  assert.equal(log.filter((q) => q.table === 'route_variant').length, 0);
});

test('a new route whose directions come back without the one saved says it could not read it back', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { data: { id: 'r7' } };
    // Only the slot comes back: the drawn way is missing.
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v50', route_id: 'r7', reversed: true })] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(
    saveDirection(input),
    /Saved the route but could not read the direction back/,
  );
  // The route is the save's own and stays: the directions are in.
  assert.equal(log.filter((q) => q.op === 'delete').length, 0);
});

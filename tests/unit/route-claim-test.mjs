// The studio's direction save when its route's ends are taken
// (src/features/studio/data/routes-write.ts, claimExistingRoute and the read-backs)
// against a fake client: what a claimed route is filled with, and what is refused in words.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/route-claim-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import {
  ENDS_TAKEN,
  foldLoopKey,
  LOOP_TAKEN,
  saveDirection,
} from '../../src/features/studio/data/routes-write.ts';

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

test("a refused update of an orphan route's facts stops the save before any direction is written", async () => {
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

test('the claim looks the route up by its ends, with via null when it has none', async () => {
  const { client, log } = claiming({ data: { id: 'r6', route_variant: [] } }, (q) => {
    if (q.table === 'route' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v13', route_id: 'r6' })] };
  });
  setSupabase(client);
  await saveDirection(input);
  assert.deepEqual(log[1].filters, [
    ['eq', 'head_stop_id', 'tala'],
    ['eq', 'tail_stop_id', 'fairview'],
    ['is', 'via', null],
  ]);
});

test('the claim looks the route up by its via when it has one', async () => {
  const { client, log } = claiming({ data: { id: 'r6', route_variant: [] } }, (q) => {
    if (q.table === 'route' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v13', route_id: 'r6' })] };
  });
  setSupabase(client);
  await saveDirection({ ...input, via: ' Zabarte ' });
  assert.deepEqual(log[1].filters, [
    ['eq', 'head_stop_id', 'tala'],
    ['eq', 'tail_stop_id', 'fairview'],
    ['eq', 'via', 'Zabarte'],
  ]);
});

test("a claimed orphan's directions being refused leaves the route: it is another save's to finish", async () => {
  const { client, log } = claiming({ data: { id: 'r6', route_variant: [] } }, (q) => {
    if (q.table === 'route' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'insert')
      return { error: { code: '42501', message: 'row-level security' } };
  });
  setSupabase(client);
  await assert.rejects(saveDirection(input), /row-level security/);
  assert.equal(log.filter((q) => q.op === 'delete').length, 0);
});

// ---------------------------------------------------------------- an ikot (0021)
// A loop has no ends: its route row carries is_loop and null ends, it is one
// direction with no slot, and its identity is its signboard and via.

const ikot = {
  ...input,
  isLoop: true,
  headHotspotId: null,
  tailHotspotId: null,
  signboard: 'UP – Ikot',
};
const ikotRow = (over) => ({
  id: 'r20',
  owner_id: 'o',
  signboard: 'UP – Ikot',
  route_code: null,
  short_name: null,
  long_name: null,
  mode: 'jeepney',
  fare_note: null,
  fare_as_of: null,
  head_stop_id: null,
  tail_stop_id: null,
  via: null,
  is_loop: true,
  ...over,
});
const LOOP_LINE = [...LINE, [121.05, 14.71], LINE[0]];

test('a new ikot is one route row with no ends and one direction row, no slot', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { data: { id: 'r20' } };
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v20', route_id: 'r20', route: ikotRow() })] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  const saved = await saveDirection({
    ...ikot,
    reversed: true, // whatever the panel says: an ikot has one way
    controlPoints: LOOP_LINE,
    segments: [{ mode: 'freehand', coordinates: LOOP_LINE }],
  });
  assert.equal(saved.id, 'v20');
  const [route, variants] = log;
  assert.equal(route.payload.is_loop, true);
  assert.equal(route.payload.head_stop_id, null);
  assert.equal(route.payload.tail_stop_id, null);
  assert.equal(route.payload.signboard, 'UP – Ikot');
  assert.equal(variants.payload.length, 1);
  assert.equal(variants.payload[0].reversed, false);
});

test('an ikot whose signboard is taken claims it by the index fold, not by ilike', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { error: refused };
    if (q.table === 'route' && q.op === 'select')
      return {
        data: [
          { id: 'r1', signboard: 'UP – Toki', via: null, route_variant: [] },
          { id: 'r21', signboard: '  up – ikot ', via: null, route_variant: [] },
        ],
      };
    if (q.table === 'route' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v21', route_id: 'r21', route: ikotRow({ id: 'r21' }) })] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  const saved = await saveDirection({ ...ikot, fareNote: '₱13' });
  assert.equal(saved.id, 'v21');
  // Only loops are read; the fold is done here.
  assert.deepEqual(log[1].filters, [['eq', 'is_loop', true]]);
  // An orphan: its facts are brought up to what was just typed, its via left as found.
  const update = log[2];
  assert.deepEqual(update.filters, [['eq', 'id', 'r21']]);
  assert.deepEqual(Object.keys(update.payload).sort(), ['fare_note', 'mode', 'signboard']);
  assert.equal(log[3].payload.length, 1);
});

test('an ikot whose via differs is not the taken one', async () => {
  const { client } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { error: refused };
    if (q.table === 'route' && q.op === 'select')
      return { data: [{ id: 'r21', signboard: 'UP – Ikot', via: 'Katipunan', route_variant: [] }] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(
    saveDirection(ikot),
    /An ikot with this signboard already exists, but it could not be read back\./,
  );
});

test('an ikot already drawn is refused in the ikot sentence, and writes nothing more', async () => {
  const drawn = { type: 'LineString', coordinates: LINE };
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { error: refused };
    if (q.table === 'route' && q.op === 'select')
      return {
        data: [
          {
            id: 'r21',
            signboard: 'UP – Ikot',
            via: null,
            route_variant: [{ id: 'v1', reversed: false, shape: drawn }],
          },
        ],
      };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(saveDirection(ikot), (e) => e.message === LOOP_TAKEN);
  assert.equal(log.length, 2);
});

test('editing an ikot writes its facts and never its ends or is_loop', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'update')
      return { data: listed({ id: 'v20', route_id: 'r20', route: ikotRow() }) };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({ ...ikot, routeId: 'r20', directionId: 'v20', writeRoute: true });
  assert.deepEqual(Object.keys(log[0].payload).sort(), ['fare_note', 'mode', 'signboard', 'via']);
});

test('editing an ikot onto a taken signboard says so; editing a route onto taken ends still says that', async () => {
  const unique = (name) => ({
    code: '23505',
    message: `duplicate key value violates unique constraint "${name}"`,
  });
  const edit = (index, input) => {
    const { client } = fakeSupabase((q) => {
      if (q.table === 'route' && q.op === 'update') return { error: unique(index) };
      throw new Error(`unexpected ${q.op} on ${q.table}`);
    });
    setSupabase(client);
    return saveDirection({ ...input, routeId: 'r20', directionId: 'v20', writeRoute: true });
  };
  await assert.rejects(edit('route_loop_unique', ikot), (e) => e.message === LOOP_TAKEN);
  await assert.rejects(edit('route_ends_unique', input), (e) => e.message === ENDS_TAKEN);
});

test('a check or trigger refusal (23514) is shown with its own words', async () => {
  const { client } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert')
      return {
        error: { code: '23514', message: 'A loop has one direction: it has no way back.' },
      };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(saveDirection(ikot), /A loop has one direction: it has no way back\./);
});

test('the fold the index uses: case and the ends of a signboard and via do not tell two apart', () => {
  assert.equal(foldLoopKey(' UP – Ikot ', null), foldLoopKey('up – ikot', ''));
  assert.notEqual(foldLoopKey('UP – Ikot', 'Katipunan'), foldLoopKey('UP – Ikot', null));
  // Inside the text, space and punctuation still count.
  assert.notEqual(foldLoopKey('UP  Ikot', null), foldLoopKey('UP Ikot', null));
});

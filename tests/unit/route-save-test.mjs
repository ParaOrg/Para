// The studio's direction save (src/features/studio/data/routes-write.ts, saveDirection)
// against a fake client: which rows a failed save takes back out.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/route-save-test.mjs
//
// Review of 2026-10-03, finding 3: when the two directions' insert failed,
// the route row was deleted whether this save had inserted it or claimed it
// from another save still in flight, and two overlapping saves of one new
// route cascaded the first one's line away.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import { deleteDirection, saveDirection } from '../../src/features/studio/data/routes-write.ts';
import { saveRouteAndLinks } from '../../src/features/studio/data/save-route.ts';

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
  controlPoints: [
    [121.04, 14.7],
    [121.05, 14.7],
  ],
  segments: [
    {
      mode: 'freehand',
      coordinates: [
        [121.04, 14.7],
        [121.05, 14.7],
      ],
    },
  ],
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

test("a save that claimed another save's route does not delete it when its directions are refused", async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { error: refused };
    // The other save's route, its directions not in yet: an orphan to claim.
    if (q.table === 'route' && q.op === 'select') return { data: { id: 'r1', route_variant: [] } };
    if (q.table === 'route' && q.op === 'update') return {};
    // Meanwhile the other save's directions landed.
    if (q.table === 'route_variant' && q.op === 'insert') return { error: refused };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(saveDirection(input));
  assert.equal(log.filter((q) => q.op === 'delete').length, 0);
});

test('a save that inserted the route takes it back out when its directions are refused', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { data: { id: 'r2' } };
    if (q.table === 'route_variant' && q.op === 'insert')
      return { error: { code: '23502', message: 'null value' } };
    if (q.table === 'route' && q.op === 'delete') return {};
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(saveDirection(input), /null value/);
  const deletes = log.filter((q) => q.op === 'delete');
  assert.equal(deletes.length, 1);
  assert.deepEqual(deletes[0].filters, [['eq', 'id', 'r2']]);
});

// Finding 6: with the session gone the publishable key matches no row, and
// PostgREST answers 2xx with nothing. That is said, not reloaded as done.
test('emptying a direction that matched no row says so', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { data: [] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(deleteDirection({ id: 'v1', routeId: 'r1' }), /Nothing was changed/);
  assert.equal(log.length, 1);
});

test('emptying a direction clears its signboards with its line', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { data: [{ id: 'v1' }] };
    if (q.table === 'route_stop' && q.op === 'delete') return {};
    if (q.table === 'route_variant' && q.op === 'select') return { count: 1 };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await deleteDirection({ id: 'v1', routeId: 'r1' });
  assert.deepEqual(log[0].payload.signboards, []);
});

test("a save whose own route another save's directions filled first leaves it", async () => {
  // A inserted the route; B claimed it and its directions landed first, so
  // A's are refused as already there. Deleting would cascade B's line away.
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { data: { id: 'r3' } };
    if (q.table === 'route_variant' && q.op === 'insert') return { error: refused };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(saveDirection(input));
  assert.equal(log.filter((q) => q.op === 'delete').length, 0);
});

test('a route with these ends but no row this way round is filled, not refused as drawn', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { error: refused };
    if (q.table === 'route' && q.op === 'select')
      return { data: { id: 'r4', route_variant: [{ id: 'v9', reversed: true, shape: {} }] } };
    if (q.table === 'route_variant' && q.op === 'update') return { data: null };
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: listed({ id: 'v10', route_id: 'r4', reversed: false }) };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  const saved = await saveDirection(input);
  assert.equal(saved.id, 'v10');
  assert.deepEqual(
    log.map((q) => `${q.table} ${q.op}`),
    ['route insert', 'route select', 'route_variant update', 'route_variant insert'],
  );
});

test("a claimed orphan's drawn row and slot both carry the claimed route id", async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { error: refused };
    // The orphan: same ends, no directions.
    if (q.table === 'route' && q.op === 'select') return { data: { id: 'r5', route_variant: [] } };
    if (q.table === 'route' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'insert')
      return {
        data: [
          listed({ id: 'v11', route_id: 'r5', reversed: false }),
          listed({ id: 'v12', route_id: 'r5', reversed: true }),
        ],
      };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  const saved = await saveDirection(input);
  assert.equal(saved.id, 'v11');
  const inserted = log.find((q) => q.table === 'route_variant' && q.op === 'insert');
  assert.equal(inserted.payload.length, 2);
  assert.deepEqual(
    inserted.payload.map((row) => [row.route_id, row.reversed]),
    [
      ['r5', false],
      ['r5', true],
    ],
  );
});

// What a save writes, field by field (the table's names: this is the boundary).
// The rows are spelled out here, not read back from directionRows, so a
// column dropped or renamed in the code fails.
const LINE = [
  [121.04, 14.7],
  [121.05, 14.7],
];
/** The drawn row of `input` for route `routeId`, going the way `reversed` says. */
const drawnRow = (routeId, reversed = false) => ({
  route_id: routeId,
  reversed,
  control_points: LINE,
  segments: [{ mode: 'freehand', coordinates: LINE }],
  shape: { type: 'LineString', coordinates: LINE },
  overview: { type: 'LineString', coordinates: LINE },
  borrowed_from: null,
  borrowed_part: null,
  borrowed_m: null,
});
/** The empty slot for the route's other way. */
const slotRow = (routeId, reversed) => ({
  route_id: routeId,
  reversed,
  control_points: [],
  segments: [],
  shape: null,
  overview: null,
  borrowed_from: null,
  borrowed_part: null,
  borrowed_m: null,
});
const ROUTE_FACTS = { signboard: null, mode: 'jeepney', fare_note: null };
const ROUTE_ENDS = { head_stop_id: 'tala', tail_stop_id: 'fairview', via: null };
const DIRECTION_COLUMNS =
  'id, route_id, direction_name, origin_terminal, destination_terminal, overview, reversed, confidence, updated_at, borrowed_from, borrowed_part, borrowed_m, signboards, route:route(*)';

test('a new route writes its facts and ends, then the drawn way and its slot', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { data: { id: 'r7' } };
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v20', route_id: 'r7', reversed: false })] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection(input);
  assert.equal(log.length, 2);
  const [routeInsert, directionInsert] = log;
  assert.deepEqual(routeInsert.payload, { ...ROUTE_FACTS, ...ROUTE_ENDS });
  assert.equal(routeInsert.select, 'id');
  assert.deepEqual(routeInsert.filters, []);
  assert.deepEqual(directionInsert.payload, [drawnRow('r7', false), slotRow('r7', true)]);
  assert.equal(directionInsert.select, DIRECTION_COLUMNS);
});

test('a new route drawn as the return writes the return drawn and the outbound as the slot', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { data: { id: 'r8' } };
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v21', route_id: 'r8', reversed: true })] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({ ...input, reversed: true });
  assert.deepEqual(log[1].payload, [drawnRow('r8', true), slotRow('r8', false)]);
});

test("a route's facts are trimmed, and blank ones are written as null", async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { data: { id: 'r9' } };
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v22', route_id: 'r9' })] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({
    ...input,
    signboard: '  Tala - Fairview ',
    fareNote: ' 13 pesos ',
    via: ' Commonwealth ',
    mode: 'bus',
  });
  assert.deepEqual(log[0].payload, {
    signboard: 'Tala - Fairview',
    mode: 'bus',
    fare_note: '13 pesos',
    head_stop_id: 'tala',
    tail_stop_id: 'fairview',
    via: 'Commonwealth',
  });
  await saveDirection({ ...input, signboard: '   ', fareNote: '', via: '  ' });
  assert.deepEqual(log[2].payload, { ...ROUTE_FACTS, ...ROUTE_ENDS });
});

test('a claimed orphan is found by its ends, brought up to the typed facts, and given both ways', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { error: refused };
    if (q.table === 'route' && q.op === 'select') return { data: { id: 'r6', route_variant: [] } };
    if (q.table === 'route' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v13', route_id: 'r6', reversed: false })] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({ ...input, signboard: 'Tala', fareNote: '13', via: 'EDSA' });
  const [, found, facts, directions] = log;
  assert.equal(found.select, 'id, route_variant(id, reversed, shape)');
  assert.deepEqual(found.filters, [
    ['eq', 'head_stop_id', 'tala'],
    ['eq', 'tail_stop_id', 'fairview'],
    ['eq', 'via', 'EDSA'],
  ]);
  assert.deepEqual(facts.payload, { signboard: 'Tala', mode: 'jeepney', fare_note: '13' });
  assert.deepEqual(facts.filters, [['eq', 'id', 'r6']]);
  assert.deepEqual(directions.payload, [drawnRow('r6', false), slotRow('r6', true)]);
});

test('a route with no via is looked for with via null', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'insert') return { error: refused };
    if (q.table === 'route' && q.op === 'select') return { data: { id: 'r6', route_variant: [] } };
    if (q.table === 'route' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: [listed({ id: 'v13', route_id: 'r6', reversed: false })] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection(input);
  assert.deepEqual(log[1].filters, [
    ['eq', 'head_stop_id', 'tala'],
    ['eq', 'tail_stop_id', 'fairview'],
    ['is', 'via', null],
  ]);
});

test("Edit route writes the route's six fields to its own row, before any line", async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'update') return { data: listed({ id: 'v30' }) };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({
    ...input,
    routeId: 'r1',
    directionId: 'v30',
    writeRoute: true,
    signboard: ' Fairview ',
    fareNote: '',
    via: ' EDSA ',
    headHotspotId: 'a',
    tailHotspotId: 'b',
    mode: 'bus',
  });
  assert.equal(log[0].table, 'route');
  assert.deepEqual(log[0].payload, {
    signboard: 'Fairview',
    mode: 'bus',
    fare_note: null,
    head_stop_id: 'a',
    tail_stop_id: 'b',
    via: 'EDSA',
  });
  assert.deepEqual(log[0].filters, [['eq', 'id', 'r1']]);
  assert.equal(log[1].table, 'route_variant');
});

test('Edit route is not asked of a route when writeRoute is off: the facts are left alone', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { data: listed({ id: 'v31' }) };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({ ...input, routeId: 'r1', directionId: 'v31', signboard: 'x' });
  assert.deepEqual(
    log.map((q) => q.table),
    ['route_variant'],
  );
});

test('Edit route to ends another route has says so in words, and writes no line', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route' && q.op === 'update') return { error: refused };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(
    saveDirection({ ...input, routeId: 'r1', directionId: 'v30', writeRoute: true }),
    /Another route already runs between these two places/,
  );
  assert.equal(log.length, 1);
});

test('a direction of an existing route is rewritten by its id with the drawn row, and nothing else', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { data: listed({ id: 'v32' }) };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({ ...input, routeId: 'r2', directionId: 'v32' });
  assert.equal(log.length, 1);
  assert.deepEqual(log[0].payload, drawnRow('r2', false));
  assert.deepEqual(log[0].filters, [['eq', 'id', 'v32']]);
  assert.equal(log[0].select, DIRECTION_COLUMNS);
  assert.equal(log[0].maybeSingle, true);
});

test("a route's empty slot is filled by route and way, and only while it has no line", async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { data: listed({ id: 'v33' }) };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({ ...input, routeId: 'r2', reversed: true });
  assert.deepEqual(log[0].payload, drawnRow('r2', true));
  assert.deepEqual(log[0].filters, [
    ['eq', 'route_id', 'r2'],
    ['eq', 'reversed', true],
    ['is', 'shape', null],
  ]);
});

test('a way with no row at all is inserted alone, as the drawn row', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { data: null };
    if (q.table === 'route_variant' && q.op === 'insert')
      return { data: listed({ id: 'v34', route_id: 'r2' }) };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({ ...input, routeId: 'r2' });
  assert.deepEqual(log[1].payload, drawnRow('r2', false));
  assert.equal(log[1].select, DIRECTION_COLUMNS);
});

test('a way already drawn is refused in words when the repair insert meets the unique index', async () => {
  const { client } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { data: null };
    if (q.table === 'route_variant' && q.op === 'insert') return { error: refused };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(
    saveDirection({ ...input, routeId: 'r2' }),
    /already has this direction drawn/,
  );
});

test('a line that borrows writes its parent, part and length; one that borrows nothing writes null', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update') return { data: listed({ id: 'v35' }) };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveDirection({
    ...input,
    routeId: 'r2',
    directionId: 'v35',
    borrowedFrom: 'v9',
    borrowedPart: 'start',
    borrowedMetres: 120,
  });
  assert.equal(log[0].payload.borrowed_from, 'v9');
  assert.equal(log[0].payload.borrowed_part, 'start');
  assert.equal(log[0].payload.borrowed_m, 120);
  await saveDirection({
    ...input,
    routeId: 'r2',
    directionId: 'v35',
    borrowedFrom: null,
    borrowedPart: 'start',
    borrowedMetres: 120,
  });
  assert.equal(log[1].payload.borrowed_from, null);
  assert.equal(log[1].payload.borrowed_part, null);
  assert.equal(log[1].payload.borrowed_m, null);
});

/** The requests deleteDirection sends for a direction `v1` of route `r1`. */
function deleteScript(drawnLeft) {
  return fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update' && q.filters[0][1] === 'id')
      return { data: [{ id: 'v1' }] };
    if (q.table === 'route_stop' && q.op === 'delete') return {};
    if (q.table === 'route_variant' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'select') return { count: drawnLeft };
    if (q.table === 'route' && q.op === 'delete') return { data: [{ id: 'r1' }] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
}

test('emptying a direction writes every column of the slot, to that row alone', async () => {
  const { client, log } = deleteScript(1);
  setSupabase(client);
  await deleteDirection({ id: 'v1', routeId: 'r1' });
  assert.deepEqual(log[0].payload, {
    control_points: [],
    segments: [],
    shape: null,
    overview: null,
    borrowed_from: null,
    borrowed_part: null,
    borrowed_m: null,
    signboards: [],
  });
  assert.deepEqual(log[0].filters, [['eq', 'id', 'v1']]);
  assert.equal(log[0].select, 'id');
});

test('emptying a direction unlinks its hotspots and lets a line extended from it go on alone', async () => {
  const { client, log } = deleteScript(1);
  setSupabase(client);
  await deleteDirection({ id: 'v1', routeId: 'r1' });
  assert.equal(log[1].table, 'route_stop');
  assert.equal(log[1].op, 'delete');
  assert.deepEqual(log[1].filters, [['eq', 'route_variant_id', 'v1']]);
  assert.equal(log[2].table, 'route_variant');
  assert.equal(log[2].op, 'update');
  assert.deepEqual(log[2].payload, { borrowed_from: null });
  assert.deepEqual(log[2].filters, [['eq', 'borrowed_from', 'v1']]);
});

test('emptying a direction counts the drawn ways its route has left, and keeps the route while one remains', async () => {
  const { client, log } = deleteScript(1);
  setSupabase(client);
  await deleteDirection({ id: 'v1', routeId: 'r1' });
  assert.equal(log[3].table, 'route_variant');
  assert.equal(log[3].select, 'id');
  assert.deepEqual(log[3].options, { count: 'exact', head: true });
  assert.deepEqual(log[3].filters, [
    ['eq', 'route_id', 'r1'],
    ['not', 'shape', 'is', null],
  ]);
  assert.equal(log.length, 4);
  assert.equal(log.filter((q) => q.table === 'route').length, 0);
});

test('emptying the last drawn way takes the route itself out, by its id', async () => {
  const { client, log } = deleteScript(0);
  setSupabase(client);
  await deleteDirection({ id: 'v1', routeId: 'r1' });
  assert.equal(log.length, 5);
  assert.equal(log[4].table, 'route');
  assert.equal(log[4].op, 'delete');
  assert.deepEqual(log[4].filters, [['eq', 'id', 'r1']]);
  assert.equal(log[4].select, 'id');
});

test('emptying the last way says so when the route delete matched no row', async () => {
  const { client } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update' && q.filters[0][1] === 'id')
      return { data: [{ id: 'v1' }] };
    if (q.table === 'route_stop' && q.op === 'delete') return {};
    if (q.table === 'route_variant' && q.op === 'update') return {};
    if (q.table === 'route_variant' && q.op === 'select') return { count: 0 };
    if (q.table === 'route' && q.op === 'delete') return { data: [] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(deleteDirection({ id: 'v1', routeId: 'r1' }), /Nothing was changed/);
});

test('a saved line is announced to its caller before the hintuan links are brought up to date', async () => {
  const order = [];
  const { client, log } = fakeSupabase((q) => {
    order.push(`${q.table} ${q.op}`);
    if (q.table === 'route_variant' && q.op === 'update')
      return { data: listed({ id: 'v40', route_id: 'r2' }) };
    if (q.table === 'stop' && q.op === 'select') return { data: [], count: 0 };
    if (q.table === 'route_stop' && q.op === 'select') return { data: [], count: 0 };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  const heard = [];
  const saved = await saveRouteAndLinks(
    { ...input, routeId: 'r2', directionId: 'v40' },
    [],
    (written) => {
      heard.push(written);
      order.push('heard');
    },
  );
  assert.deepEqual(heard, [{ routeId: 'r2', directionId: 'v40' }]);
  assert.equal(saved.id, 'v40');
  assert.equal(order[0], 'route_variant update');
  assert.equal(order[1], 'heard');
  assert.deepEqual(
    log.map((q) => `${q.table} ${q.op}`),
    ['route_variant update', 'stop select', 'route_stop select'],
  );
});

test('a refused link sync says the line is saved and to press Save again', async () => {
  const { client } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update')
      return { data: listed({ id: 'v41', route_id: 'r2' }) };
    if (q.table === 'stop' && q.op === 'select') return { error: { message: 'network' } };
    if (q.table === 'route_stop' && q.op === 'select') return { data: [], count: 0 };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  let heard = null;
  await assert.rejects(
    saveRouteAndLinks({ ...input, routeId: 'r2', directionId: 'v41' }, [], (w) => (heard = w)),
    /The line is saved, but its hintuan links are not: network\. Press Save again to retry\./,
  );
  assert.deepEqual(heard, { routeId: 'r2', directionId: 'v41' });
});

// ---------------------------------------------------------------- an ikot's links (0021)

/** A stop row as the table answers it, whole, with a box of about 20 m round `at`. */
const stopAt = (id, kind, at) => ({
  id,
  owner_id: 'o',
  name: id,
  informal: null,
  aliases: [],
  kind,
  point: { type: 'Point', coordinates: at },
  area: {
    type: 'Polygon',
    coordinates: [
      [
        [at[0] - 0.0001, at[1] - 0.0001],
        [at[0] + 0.0001, at[1] - 0.0001],
        [at[0] + 0.0001, at[1] + 0.0001],
        [at[0] - 0.0001, at[1] + 0.0001],
        [at[0] - 0.0001, at[1] - 0.0001],
      ],
    ],
  },
  note: null,
  created_at: '2026-10-07T00:00:00Z',
  line: null,
});
const IKOT_LINE = [
  [121.04, 14.7],
  [121.05, 14.7],
  [121.05, 14.71],
  [121.04, 14.71],
  [121.04, 14.7],
];
const ikotInput = {
  ...input,
  isLoop: true,
  headHotspotId: null,
  tailHotspotId: null,
  signboard: 'UP – Ikot',
  routeId: 'r20',
  directionId: 'v20',
  controlPoints: IKOT_LINE,
  segments: [{ mode: 'freehand', coordinates: IKOT_LINE }],
};
const ikotRoute = {
  ...listed({}).route,
  id: 'r20',
  signboard: 'UP – Ikot',
  head_stop_id: null,
  tail_stop_id: null,
  is_loop: true,
};

/** What a save's link sync asks for and writes, against a stop table and a set of existing links. */
async function syncedAfterSaving(saveInput, route, stops, existingLinks) {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'route_variant' && q.op === 'update')
      return { data: listed({ id: 'v20', route_id: 'r20', route }) };
    if (q.table === 'stop' && q.op === 'select') return { data: stops, count: stops.length };
    if (q.table === 'route_stop' && q.op === 'select')
      return { data: existingLinks, count: existingLinks.length };
    if (q.table === 'route_stop') return {};
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveRouteAndLinks(saveInput, [], () => {});
  return log;
}

test("an ikot's link sync reads terminals as well as hintuans, and links the ones on its line", async () => {
  const stops = [
    stopAt('t1', 'terminal', [121.045, 14.7]),
    stopAt('h1', 'hintuan', [121.05, 14.705]),
  ];
  const log = await syncedAfterSaving(ikotInput, ikotRoute, stops, []);
  const read = log.find((q) => q.table === 'stop' && q.op === 'select');
  assert.deepEqual(read.filters[0], ['in', 'kind', ['hintuan', 'terminal']]);
  const upsert = log.find((q) => q.op === 'upsert');
  assert.deepEqual(upsert.payload.map((l) => l.stop_id).sort(), ['h1', 't1']);
});

test("an ikot's link sync drops a terminal link its line no longer earns", async () => {
  const stops = [
    stopAt('t-far', 'terminal', [121.3, 14.9]),
    stopAt('h1', 'hintuan', [121.05, 14.705]),
  ];
  const log = await syncedAfterSaving(ikotInput, ikotRoute, stops, [{ stop_id: 't-far' }]);
  const del = log.find((q) => q.table === 'route_stop' && q.op === 'delete');
  assert.deepEqual(del.filters, [
    ['eq', 'route_variant_id', 'v20'],
    ['in', 'stop_id', ['t-far']],
  ]);
});

test("a route with ends still reads hintuans only: its terminals are the owner's", async () => {
  const stops = [stopAt('h1', 'hintuan', [121.045, 14.7])];
  const log = await syncedAfterSaving(
    { ...input, routeId: 'r20', directionId: 'v20' },
    listed({}).route,
    stops,
    [],
  );
  const read = log.find((q) => q.table === 'stop' && q.op === 'select');
  assert.deepEqual(read.filters[0], ['in', 'kind', ['hintuan']]);
});

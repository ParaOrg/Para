// The hintuan links a direction save brings up to date
// (src/features/studio/data/hotspots-write.ts, syncHintuanLinks) against a fake client:
// which route_stop rows it writes and which it takes out.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/hotspot-links-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import { syncHintuanLinks } from '../../src/features/studio/data/hotspots-write.ts';

/** A line that runs east through two boxes, `near` and `far`. */
const LINE = [
  [121.0399, 14.70005],
  [121.04005, 14.70005],
  [121.0402, 14.70005],
  [121.0503, 14.70005],
  [121.0505, 14.70005],
  [121.0507, 14.70005],
];
const direction = {
  id: 'v1',
  routeId: 'r1',
  reversed: false,
  shape: { type: 'LineString', coordinates: LINE },
  segments: [],
  route: { mode: 'jeepney', line: null },
};

/** A hintuan row as the table answers it, whole, with a box `x` east and `y` north of 121.04, 14.7. */
const hintuan = (id, x, y = 14.7) => {
  const ring = [
    [x, y],
    [x + 0.0001, y],
    [x + 0.0001, y + 0.0001],
    [x, y + 0.0001],
  ];
  return {
    id,
    owner_id: 'o',
    name: id,
    informal: null,
    aliases: [],
    kind: 'hintuan',
    point: { type: 'Point', coordinates: [x + 0.00005, y + 0.00005] },
    area: { type: 'Polygon', coordinates: [[...ring, ring[0]]] },
    note: null,
    created_at: '2026-10-07T00:00:00Z',
    line: null,
  };
};

/** The fake: `hintuans` in the stop table, `linked` ids already on the direction. */
function script(hintuans, linked) {
  return fakeSupabase((q) => {
    if (q.table === 'stop' && q.op === 'select') return { data: hintuans, count: hintuans.length };
    if (q.table === 'route_stop' && q.op === 'select')
      return { data: linked.map((id) => ({ stop_id: id })), count: linked.length };
    if (q.table === 'route_stop') return {};
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
}

test('the hintuans are read with their boxes and the direction’s own links, each in one ordered request', async () => {
  const { client, log } = script([hintuan('near', 121.04)], []);
  setSupabase(client);
  await syncHintuanLinks(direction);
  const [stops, links] = log;
  assert.equal(stops.table, 'stop');
  assert.equal(stops.select, '*');
  assert.deepEqual(stops.options, { count: 'exact' });
  assert.deepEqual(stops.filters, [
    ['eq', 'kind', 'hintuan'],
    ['not', 'area', 'is', null],
  ]);
  assert.equal(links.table, 'route_stop');
  assert.equal(links.select, 'stop_id');
  assert.deepEqual(links.filters, [['eq', 'route_variant_id', 'v1']]);
});

test('a hintuan the line passes is linked, in passing order, with the segment it is met at', async () => {
  const { client, log } = script([hintuan('far', 121.0504), hintuan('near', 121.04)], []);
  setSupabase(client);
  await syncHintuanLinks(direction);
  const up = log.find((q) => q.op === 'upsert');
  assert.deepEqual(up.payload, [
    { route_variant_id: 'v1', stop_id: 'near', stop_sequence: 1 },
    { route_variant_id: 'v1', stop_id: 'far', stop_sequence: 3 },
  ]);
  assert.deepEqual(up.upsertOptions, { onConflict: 'route_variant_id,stop_id' });
  assert.equal(log.filter((q) => q.op === 'delete').length, 0);
});

test('a hintuan linked that the line no longer passes is unlinked; the ones it still passes are kept', async () => {
  const { client, log } = script(
    [hintuan('near', 121.04), hintuan('away', 121.3)],
    ['near', 'away'],
  );
  setSupabase(client);
  await syncHintuanLinks(direction);
  const del = log.find((q) => q.op === 'delete');
  assert.equal(del.table, 'route_stop');
  assert.deepEqual(del.filters, [
    ['eq', 'route_variant_id', 'v1'],
    ['in', 'stop_id', ['away']],
  ]);
  const up = log.find((q) => q.op === 'upsert');
  assert.deepEqual(up.payload, [{ route_variant_id: 'v1', stop_id: 'near', stop_sequence: 1 }]);
});

test('a link to a place that is not a hintuan (a terminal) is never dropped, however far the line runs', async () => {
  const { client, log } = script([hintuan('near', 121.04)], ['near', 'a-terminal']);
  setSupabase(client);
  await syncHintuanLinks(direction);
  assert.equal(log.filter((q) => q.op === 'delete').length, 0);
});

test('with no hintuan on the map nothing is written', async () => {
  const { client, log } = script([], ['a-terminal']);
  setSupabase(client);
  await syncHintuanLinks(direction);
  assert.deepEqual(
    log.map((q) => `${q.table} ${q.op}`),
    ['stop select', 'route_stop select'],
  );
});

test('a line that passes no hintuan and has none linked writes nothing', async () => {
  const { client, log } = script([hintuan('away', 121.3)], []);
  setSupabase(client);
  await syncHintuanLinks(direction);
  assert.equal(log.filter((q) => q.op === 'upsert' || q.op === 'delete').length, 0);
});

test('a refused unlink or upsert is thrown with the database’s words', async () => {
  const refuse = (op) =>
    fakeSupabase((q) => {
      if (q.table === 'stop' && q.op === 'select')
        return { data: [hintuan('near', 121.04), hintuan('away', 121.3)], count: 2 };
      if (q.table === 'route_stop' && q.op === 'select')
        return { data: [{ stop_id: 'away' }], count: 1 };
      if (q.table === 'route_stop' && q.op === op) return { error: { message: `${op} refused` } };
      if (q.table === 'route_stop') return {};
      throw new Error(`unexpected ${q.op} on ${q.table}`);
    });
  setSupabase(refuse('delete').client);
  await assert.rejects(syncHintuanLinks(direction), /delete refused/);
  setSupabase(refuse('upsert').client);
  await assert.rejects(syncHintuanLinks(direction), /upsert refused/);
});

// The studio's hotspot save (src/features/studio/data/hotspots-write.ts, saveHotspot)
// against a fake client.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/hotspot-save-test.mjs
//
// Review of 2026-10-03, finding 4: the row goes in, then its links in
// separate requests; when the links failed, Save again inserted the box a
// second time. saveHotspot now says which row it wrote, and the retry, given
// that id, updates it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './fixtures/fake-supabase.mjs';
import { setSupabase } from '../../src/features/studio/data/supabase.ts';
import { deleteHotspot, saveHotspot } from '../../src/features/studio/data/hotspots-write.ts';

const ring = [
  [121.04, 14.7],
  [121.0401, 14.7],
  [121.0401, 14.7001],
  [121.04, 14.7001],
];
const input = {
  hotspotId: null,
  kind: 'hintuan',
  name: 'Tala Ilalim',
  informal: 'Tala',
  aliases: [],
  note: '',
  ring,
  directions: [],
};
// The stop row as the table answers it, whole: the boundary parses what comes back.
const row = {
  id: 's1',
  owner_id: 'o',
  name: 'Tala Ilalim',
  informal: 'Tala',
  aliases: [],
  kind: 'hintuan',
  point: { type: 'Point', coordinates: [121.04, 14.7] },
  area: null,
  note: null,
  created_at: '2026-10-07T00:00:00Z',
  line: null,
};

test('a hotspot whose links failed is updated by the retry, not inserted again', async () => {
  let linksDown = true;
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'stop' && (q.op === 'insert' || q.op === 'update')) return { data: row };
    if (q.table === 'route_stop' && q.op === 'delete')
      return linksDown ? { error: { message: 'network' } } : {};
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  let written = null;
  await assert.rejects(
    saveHotspot(input, (id) => (written = id)),
    /hotspot is saved.*Press Save again/,
  );
  assert.equal(written, 's1');

  linksDown = false;
  const saved = await saveHotspot({ ...input, hotspotId: written }, (id) => (written = id));
  assert.equal(saved.id, 's1');
  const hotspotWrites = log.filter((q) => q.table === 'stop').map((q) => q.op);
  assert.deepEqual(hotspotWrites, ['insert', 'update']);
  assert.deepEqual(log.filter((q) => q.table === 'stop')[1].filters, [['eq', 'id', 's1']]);
});

test('a hotspot delete that matched no row says so (review of 2026-10-03, finding 6)', async () => {
  const { client } = fakeSupabase((q) => {
    if (q.table === 'stop' && q.op === 'delete') return { data: [] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(deleteHotspot({ id: 's1' }), /Nothing was changed/);
});

// What a hotspot save writes, field by field (the table's names: this file's
// code is the boundary). The expected rows are spelled out, not computed by
// the code under test.
const POLYGON = {
  type: 'Polygon',
  coordinates: [[...ring, ring[0]]],
};
const CENTRE = { type: 'Point', coordinates: [121.04005, 14.70005] };
/** A line that runs through the box: its second vertex is the first one inside it. */
const THROUGH = [
  [121.0399, 14.70005],
  [121.04005, 14.70005],
  [121.0402, 14.70005],
];
/** A direction as the studio holds it, as far as a save reads it. */
const direction = (id, line) => ({
  id,
  routeId: 'r' + id,
  reversed: false,
  shape: { type: 'LineString', coordinates: line },
  segments: [],
  route: { mode: 'jeepney', line: null },
});

/** A fake that answers every request a save sends, so `log` can be read after. */
function acceptingClient(stopRow = row) {
  return fakeSupabase((q) => {
    if (q.table === 'stop' && (q.op === 'insert' || q.op === 'update')) return { data: stopRow };
    if (q.table === 'route_stop') return {};
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
}

test('a new hotspot writes its normalised name, kind, outline and centre', async () => {
  const { client, log } = acceptingClient();
  setSupabase(client);
  await saveHotspot({
    ...input,
    name: '  Tala   Ilalim ',
    informal: 'Tala',
    aliases: ['Tala Bridge'],
    note: ' Under the flyover ',
  });
  const [write] = log;
  assert.equal(write.table, 'stop');
  assert.equal(write.op, 'insert');
  assert.deepEqual(write.payload, {
    name: 'Tala Ilalim',
    informal: 'Tala',
    aliases: ['Tala Bridge'],
    kind: 'hintuan',
    note: 'Under the flyover',
    area: POLYGON,
    point: CENTRE,
  });
  assert.equal(write.select, '*');
  assert.deepEqual(write.filters, []);
});

test('an informal name that is the name in other letters, or blank, is written as null', async () => {
  const { client, log } = acceptingClient();
  setSupabase(client);
  await saveHotspot({ ...input, name: 'Tala', informal: 'TALA', note: '' });
  assert.equal(log[0].payload.informal, null);
  assert.equal(log[0].payload.note, null);
  await saveHotspot({ ...input, name: 'Tala', informal: '' });
  const second = log.filter((q) => q.table === 'stop')[1];
  assert.equal(second.payload.informal, null);
});

test('the outline is rounded to six decimals before it is written', async () => {
  const { client, log } = acceptingClient();
  setSupabase(client);
  await saveHotspot({
    ...input,
    ring: ring.map(([x, y]) => [x + 0.00000004, y + 0.00000004]),
  });
  assert.deepEqual(log[0].payload.area, POLYGON);
  assert.deepEqual(log[0].payload.point, CENTRE);
});

test("saving a hotspot again by its id updates that row's fields, and only that row", async () => {
  const { client, log } = acceptingClient();
  setSupabase(client);
  await saveHotspot({ ...input, hotspotId: 's1', note: 'Moved' });
  assert.equal(log[0].op, 'update');
  assert.equal(log[0].payload.note, 'Moved');
  assert.equal(log[0].payload.name, 'Tala Ilalim');
  assert.deepEqual(log[0].filters, [['eq', 'id', 's1']]);
});

test('a hotspot with no corners to speak of, or no name, writes nothing', async () => {
  const { client, log } = acceptingClient();
  setSupabase(client);
  await assert.rejects(saveHotspot({ ...input, ring: ring.slice(0, 2) }), /at least three corners/);
  await assert.rejects(saveHotspot({ ...input, name: '   ' }), /needs a name/);
  assert.equal(log.length, 0);
});

test('a second terminal at a place is refused in words', async () => {
  const { client } = fakeSupabase((q) => {
    if (q.table === 'stop' && q.op === 'insert')
      return {
        error: {
          code: '23505',
          message: 'duplicate key value violates stop_terminal_place_unique',
        },
      };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await assert.rejects(
    saveHotspot({ ...input, kind: 'terminal' }),
    /There is already a terminal at "Tala"\. A place has one terminal/,
  );
});

test('a hintuan with no line through it clears its links and writes none', async () => {
  const { client, log } = acceptingClient();
  setSupabase(client);
  await saveHotspot({
    ...input,
    directions: [
      direction('v1', [
        [121.1, 14.8],
        [121.11, 14.8],
      ]),
    ],
  });
  const links = log.filter((q) => q.table === 'route_stop');
  assert.equal(links.length, 1);
  assert.equal(links[0].op, 'delete');
  assert.deepEqual(links[0].filters, [['eq', 'stop_id', 's1']]);
});

test('a hintuan is linked to each line that passes through it, at the vertex it meets the box', async () => {
  const { client, log } = acceptingClient();
  setSupabase(client);
  await saveHotspot({
    ...input,
    directions: [
      direction('v1', THROUGH),
      direction('v2', [
        [121.1, 14.8],
        [121.11, 14.8],
      ]),
    ],
  });
  const links = log.filter((q) => q.table === 'route_stop');
  assert.deepEqual(
    links.map((q) => q.op),
    ['delete', 'insert'],
  );
  assert.deepEqual(links[1].payload, [{ route_variant_id: 'v1', stop_id: 's1', stop_sequence: 1 }]);
});

test('a terminal is linked to the directions ticked, and to no others, in the ticked order', async () => {
  const { client, log } = acceptingClient({ ...row, kind: 'terminal' });
  setSupabase(client);
  await saveHotspot({
    ...input,
    kind: 'terminal',
    directionIds: ['v2', 'v1', 'gone'],
    directions: [
      direction('v1', THROUGH),
      direction('v2', [
        [121.1, 14.8],
        [121.11, 14.8],
      ]),
      direction('v3', THROUGH),
    ],
  });
  const links = log.filter((q) => q.table === 'route_stop');
  assert.deepEqual(links[0].filters, [['eq', 'stop_id', 's1']]);
  // v2 never enters the box: sequence 0, still a valid ordered link. v3 was not ticked; "gone" is no saved direction.
  assert.deepEqual(links[1].payload, [
    { route_variant_id: 'v2', stop_id: 's1', stop_sequence: 0 },
    { route_variant_id: 'v1', stop_id: 's1', stop_sequence: 1 },
  ]);
});

test('a terminal with none ticked clears its links and writes none', async () => {
  const { client, log } = acceptingClient({ ...row, kind: 'terminal' });
  setSupabase(client);
  await saveHotspot({
    ...input,
    kind: 'terminal',
    directionIds: [],
    directions: [direction('v1', THROUGH)],
  });
  assert.deepEqual(
    log.filter((q) => q.table === 'route_stop').map((q) => q.op),
    ['delete'],
  );
});

test("a hintuan's ticked directions are ignored: its links are worked out from the ground", async () => {
  const { client, log } = acceptingClient();
  setSupabase(client);
  await saveHotspot({
    ...input,
    directionIds: ['v2'],
    directions: [
      direction('v1', THROUGH),
      direction('v2', [
        [121.1, 14.8],
        [121.11, 14.8],
      ]),
    ],
  });
  const inserted = log.find((q) => q.table === 'route_stop' && q.op === 'insert');
  assert.deepEqual(inserted.payload, [{ route_variant_id: 'v1', stop_id: 's1', stop_sequence: 1 }]);
});

test('a hotspot is deleted by its id alone', async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'stop' && q.op === 'delete') return { data: [{ id: 's1' }] };
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await deleteHotspot({ id: 's1' });
  assert.equal(log.length, 1);
  assert.deepEqual(log[0].filters, [['eq', 'id', 's1']]);
  assert.equal(log[0].select, 'id');
});

test('a station is linked to the train of its line, not to the jeep or the other line passing under it', async () => {
  const { client, log } = acceptingClient({ ...row, line: 'LRT-1' });
  setSupabase(client);
  await saveHotspot({
    ...input,
    directions: [
      direction('v1', THROUGH),
      { ...direction('v2', THROUGH), route: { mode: 'lrt', routeCode: 'LRT-1' } },
      { ...direction('v3', THROUGH), route: { mode: 'mrt', routeCode: 'MRT-3' } },
    ],
  });
  const inserted = log.find((q) => q.table === 'route_stop' && q.op === 'insert');
  assert.deepEqual(inserted.payload, [{ route_variant_id: 'v2', stop_id: 's1', stop_sequence: 1 }]);
});

// ---------------------------------------------------------------- an ikot's terminals (0021)

/** A direction row as the list holds it, with a line through the ring. */
const through = (id, isLoop) => ({
  id,
  routeId: `r-${id}`,
  shape: {
    type: 'LineString',
    coordinates: [
      [121.0399, 14.70005],
      [121.0402, 14.70005],
    ],
  },
  route: { mode: 'jeepney', ...(isLoop ? { isLoop: true } : {}) },
});

test("a terminal's links are the ticked directions and every ikot through its outline", async () => {
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'stop' && (q.op === 'insert' || q.op === 'update'))
      return { data: { ...row, kind: 'terminal' } };
    if (q.table === 'route_stop') return {};
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveHotspot({
    ...input,
    kind: 'terminal',
    // 'ikot' is ticked as well (a link it already had): it is not the owner's to pick.
    directionIds: ['plain', 'ikot'],
    directions: [through('plain', false), through('ikot', true), through('other-ikot', true)],
  });
  const inserted = log.find((q) => q.table === 'route_stop' && q.op === 'insert');
  assert.deepEqual(inserted.payload.map((l) => l.route_variant_id).sort(), [
    'ikot',
    'other-ikot',
    'plain',
  ]);
});

test('an ikot the outline no longer meets loses its link on a terminal save', async () => {
  const away = {
    ...through('ikot', true),
    shape: {
      type: 'LineString',
      coordinates: [
        [121.2, 14.9],
        [121.21, 14.9],
      ],
    },
  };
  const { client, log } = fakeSupabase((q) => {
    if (q.table === 'stop' && (q.op === 'insert' || q.op === 'update'))
      return { data: { ...row, kind: 'terminal' } };
    if (q.table === 'route_stop') return {};
    throw new Error(`unexpected ${q.op} on ${q.table}`);
  });
  setSupabase(client);
  await saveHotspot({ ...input, kind: 'terminal', directionIds: ['ikot'], directions: [away] });
  assert.equal(log.filter((q) => q.table === 'route_stop' && q.op === 'insert').length, 0);
});

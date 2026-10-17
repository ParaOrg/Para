// The publish's shapes (scripts/publish/shapes.mjs): the whole map and the
// older ones cut from it.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/publish-shapes-test.mjs
//
// Why this exists: a loop has no head or tail, and an installed app reading
// shape 4 or older refuses the whole map for one such row. The publish must
// write loops into shape 5 only, leave shapes 1 to 4 byte for byte what they
// were, and never write a file before every one is known good.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  ShapeError,
  buildFiles,
  indexRowsOf,
  isLoopRow,
  shapesOf,
  stampFile,
  withoutLoops,
} from '../../scripts/publish/shapes.mjs';

const dataPath = (name) => fileURLToPath(new URL(`../../public/data/${name}`, import.meta.url));
const text = (name) => readFileSync(dataPath(name), 'utf8');

/**
 * The publish's own inputs, put back together from the committed index and
 * its line files: the rows as the publish holds them before it writes
 * (full lines as `shape`, the overviews and signboards beside).
 */
function committedRows() {
  const index = JSON.parse(text('index.v5.json'));
  const overviews = new Map();
  const boardsOf = new Map();
  const variants = index.variants.map(({ overview, signboards, metres, ...v }) => {
    if (overview) overviews.set(v.id, overview);
    if (signboards) boardsOf.set(v.id, signboards);
    const shape = overview ? JSON.parse(text(`lines/${v.id}.json`)).shape : null;
    const { id, route_id, direction_name, origin_terminal, destination_terminal } = v;
    const { reversed, confidence, route } = v;
    return {
      id,
      route_id,
      direction_name,
      origin_terminal,
      destination_terminal,
      shape,
      reversed,
      confidence,
      route,
    };
  });
  return {
    index,
    all: { variants, stops: index.stops, links: index.links },
    context: { overviews, boardsOf },
  };
}

/** A loop saved on the committed map: a closed ring near its first stop, and two of its stops linked. */
function withALoop({ index, all, context }) {
  const [x, y] = all.stops.find((s) => s.point)?.point.coordinates ?? [121, 14.6];
  const ring = [
    [x, y],
    [x + 0.002, y],
    [x + 0.002, y + 0.002],
    [x, y + 0.002],
    [x, y],
  ];
  const route = {
    id: 'loop-route',
    signboard: 'UP – Ikot',
    long_name: null,
    mode: 'jeepney',
    fare_note: null,
    head_stop_id: null,
    tail_stop_id: null,
    via: null,
    name: 'UP – Ikot',
    is_loop: true,
  };
  const loop = {
    id: 'loop-direction',
    route_id: 'loop-route',
    direction_name: 'UP – Ikot',
    origin_terminal: null,
    destination_terminal: null,
    shape: { type: 'LineString', coordinates: ring },
    reversed: false,
    confidence: all.variants[0].confidence,
    route,
  };
  const overviews = new Map(context.overviews).set(loop.id, loop.shape);
  return {
    index,
    all: {
      variants: [...all.variants, loop],
      stops: all.stops,
      links: [
        ...all.links,
        { route_variant_id: loop.id, stop_id: all.stops[0].id, stop_sequence: 1 },
        { route_variant_id: loop.id, stop_id: all.stops[1].id, stop_sequence: 2 },
      ],
    },
    context: { ...context, overviews },
  };
}

test('the committed map, put through the publish, is the committed files byte for byte', () => {
  const { index, all, context } = committedRows();
  const files = buildFiles(all, index.published_at, context);
  assert.equal(files.v5, text('index.v5.json'));
  assert.equal(files.v4, text('index.v4.json'));
  assert.equal(files.v3, text('index.v3.json'));
  assert.equal(files.v2, text('index.json'));
  assert.equal(files.map, text('map.json'));
});

test('a saved loop reaches shape 5 only: shapes 1 to 4 stay byte for byte what they were', () => {
  const { index, all, context } = withALoop(committedRows());
  const files = buildFiles(all, index.published_at, context);
  assert.equal(files.v4, text('index.v4.json'));
  assert.equal(files.v3, text('index.v3.json'));
  assert.equal(files.v2, text('index.json'));
  assert.equal(files.map, text('map.json'));
  const v5 = JSON.parse(files.v5);
  assert.equal(v5.schema, 5);
  const loops = v5.variants.filter((v) => v.route.is_loop === true);
  assert.equal(loops.length, 1);
  assert.equal(v5.variants.length, JSON.parse(text('index.v5.json')).variants.length + 1);
  assert.equal(v5.links.length, JSON.parse(text('index.v5.json')).links.length + 2);
  // A loop's route has no ends, and is_loop comes last; every other row has no such key.
  assert.equal(loops[0].route.head_stop_id, null);
  assert.equal(loops[0].route.tail_stop_id, null);
  assert.equal(Object.keys(loops[0].route).at(-1), 'is_loop');
  assert.equal(
    v5.variants.filter((v) => 'is_loop' in v.route).length,
    1,
    'only the loop carries the key',
  );
});

test('withoutLoops drops a loop and its links and keeps every stop', () => {
  const { all } = withALoop(committedRows());
  const cut = withoutLoops(all);
  assert.deepEqual([...cut.ids.variants], ['loop-direction']);
  assert.equal(cut.variants.some(isLoopRow), false);
  assert.equal(
    cut.links.some((l) => l.route_variant_id === 'loop-direction'),
    false,
  );
  assert.equal(cut.stops, all.stops);
});

test('a route with no ends is a loop to the publish even without its flag, and is never written below shape 5', () => {
  const { all } = withALoop(committedRows());
  const unflagged = structuredClone(all);
  delete unflagged.variants.at(-1).route.is_loop;
  assert.equal(isLoopRow(unflagged.variants.at(-1)), true);
  for (const rows of Object.values(shapesOf(unflagged)).slice(1)) {
    assert.equal(rows.variants.some(isLoopRow), false);
  }
});

test('a file the app could not read is refused before anything is written', () => {
  const { all, context } = committedRows();
  const broken = structuredClone(all);
  broken.stops[0].kind = 'bus stop';
  assert.throws(() => buildFiles(broken, '2026-10-17T00:00:00Z', context), ShapeError);
  assert.throws(
    () => stampFile(5, 'x', indexRowsOf(broken, context)),
    /not an index the app reads/,
  );
});

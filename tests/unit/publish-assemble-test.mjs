// The publish's assembly (scripts/publish/assemble.mjs) and its choice of
// signboards (scripts/publish/signboard-files.mjs): the database's rows in, the
// map's rows out, with nothing read or written.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/publish-assemble-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AssembleError,
  assembleMap,
  maxDeviation,
  publishedAtOf,
  roundGeometry,
  sourceRevisionsOf,
} from '../../scripts/publish/assemble.mjs';
import { boardsNamed, sortBoards } from '../../scripts/publish/signboard-files.mjs';

const BOARD_A = '11111111-1111-4111-8111-111111111111.svg';
const BOARD_B = '22222222-2222-4222-8222-222222222222.svg';

function route(overrides = {}) {
  return {
    id: 'r1',
    revision: 3,
    signboard: null,
    route_code: null,
    long_name: null,
    mode: 'jeepney',
    fare_note: null,
    head_stop_id: 's1',
    tail_stop_id: 's2',
    via: null,
    is_loop: false,
    ...overrides,
  };
}

/** A straight road with a point every few metres, as the router draws one. */
const ROAD = Array.from({ length: 50 }, (_, i) => [121 + i * 0.00003, 14.6]);

function direction(overrides = {}) {
  return {
    id: 'v1',
    route_id: 'r1',
    direction_name: 'stored, never used',
    origin_terminal: null,
    destination_terminal: null,
    shape: { type: 'LineString', coordinates: ROAD },
    confidence: 'drawn',
    reversed: false,
    signboards: [],
    route: route(),
    ...overrides,
  };
}

const HOTSPOTS = [
  {
    id: 's1',
    revision: 1,
    name: 'Fairview Terminal',
    informal: 'SM Fairview',
    aliases: null,
    kind: 'terminal',
    point: { type: 'Point', coordinates: [121.123456789, 14.987654321] },
    area: null,
    note: null,
    created_at: '2026-10-01T00:00:00Z',
    line: null,
  },
  {
    id: 's2',
    revision: 2,
    name: 'Tala',
    informal: '  ',
    aliases: ['Tala Market'],
    kind: 'hintuan',
    point: null,
    area: null,
    note: 'a note',
    created_at: '2026-10-02T00:00:00Z',
    line: 'LRT-1',
  },
];
const LINKS = [{ route_variant_id: 'v1', stop_id: 's1', stop_sequence: 1, extra: 'dropped' }];

test("a direction is named from its ends' labels, thinned, and keeps the file's key order", () => {
  const { variants, overviews, stats } = assembleMap([direction()], HOTSPOTS, LINKS);
  const [v] = variants;
  assert.deepEqual(Object.keys(v), [
    'id',
    'route_id',
    'direction_name',
    'origin_terminal',
    'destination_terminal',
    'shape',
    'reversed',
    'confidence',
    'route',
  ]);
  assert.equal(v.direction_name, 'SM Fairview → Tala');
  assert.equal(v.route.name, 'SM Fairview – Tala');
  assert.ok(!('route_code' in v.route) && !('is_loop' in v.route), 'neither on a plain jeep');
  // A straight road thins to its two ends.
  assert.deepEqual(
    v.shape.coordinates,
    [ROAD[0], ROAD.at(-1)].map(([x, y]) => [x, y]),
  );
  assert.ok(overviews.has('v1'));
  assert.equal(stats[0].before, 50);
  assert.equal(stats[0].after, 2);
});

test('a reversed direction runs from its tail to its head', () => {
  const { variants } = assembleMap([direction({ reversed: true })], HOTSPOTS, LINKS);
  assert.equal(variants[0].direction_name, 'Tala → SM Fairview');
});

test('a direction with no line yet is published with shape null and no overview', () => {
  const { variants, overviews, stats } = assembleMap([direction({ shape: null })], HOTSPOTS, []);
  assert.equal(variants[0].shape, null);
  assert.equal(overviews.size, 0);
  assert.equal(stats.length, 0);
});

test("a train's line carries its code; a jeep's code is not published", () => {
  const train = assembleMap(
    [direction({ route: route({ mode: 'lrt', route_code: 'LRT-1' }) })],
    HOTSPOTS,
    [],
  );
  assert.equal(train.variants[0].route.route_code, 'LRT-1');
  const jeep = assembleMap([direction({ route: route({ route_code: 'J-1' }) })], HOTSPOTS, []);
  assert.ok(!('route_code' in jeep.variants[0].route));
});

test('a loop is called by its signboard and marked last', () => {
  const loop = route({ is_loop: true, head_stop_id: null, tail_stop_id: null, signboard: 'Cubao' });
  const { variants } = assembleMap([direction({ route: loop })], HOTSPOTS, []);
  assert.equal(variants[0].route.name, 'Cubao');
  assert.equal(variants[0].direction_name, 'Cubao');
  assert.equal(Object.keys(variants[0].route).at(-1), 'is_loop');
});

test('rows that cannot be published are refused with why', () => {
  const refused = (rows, hotspots, pattern) =>
    assert.throws(
      () => assembleMap(rows, hotspots, []),
      (e) => e instanceof AssembleError && pattern.test(e.message),
    );
  refused([direction({ route: null })], HOTSPOTS, /came without its route/);
  refused([direction()], HOTSPOTS.slice(0, 1), /an end hotspot is missing/);
  refused(
    [direction({ route: route({ is_loop: true, tail_stop_id: null, signboard: 'X' }) })],
    HOTSPOTS,
    /a loop has neither head nor tail/,
  );
  refused(
    [direction({ route: route({ is_loop: true, head_stop_id: null, tail_stop_id: null }) })],
    HOTSPOTS,
    /a loop is called by it/,
  );
});

test("a hotspot's point is rounded to 6 decimals and its blanks filled", () => {
  const { stops } = assembleMap([], HOTSPOTS, []);
  assert.deepEqual(stops[0].point.coordinates, [121.123457, 14.987654]);
  assert.deepEqual(stops[0].aliases, []);
  assert.ok(!('line' in stops[0]), 'a line only on a station');
  assert.equal(stops[1].line, 'LRT-1');
  assert.deepEqual(Object.keys(stops[0]), [
    'id',
    'name',
    'informal',
    'aliases',
    'kind',
    'point',
    'area',
    'note',
    'created_at',
  ]);
});

test('a link keeps only its three columns', () => {
  const { links } = assembleMap([], HOTSPOTS, LINKS);
  assert.deepEqual(links, [{ route_variant_id: 'v1', stop_id: 's1', stop_sequence: 1 }]);
});

test('roundGeometry rounds a Point and a Polygon and leaves anything else', () => {
  assert.deepEqual(roundGeometry({ type: 'Point', coordinates: [1.23456789, 2] }), {
    type: 'Point',
    coordinates: [1.234568, 2],
  });
  const ring = [
    [1.0000004, 1],
    [2, 2],
    [1.0000004, 1],
  ];
  assert.deepEqual(
    roundGeometry({ type: 'Polygon', coordinates: [ring] }).coordinates[0][0],
    [1, 1],
  );
  assert.equal(roundGeometry(null), null);
  const line = { type: 'LineString', coordinates: [[1.23456789, 2]] };
  assert.equal(roundGeometry(line), line);
});

test('maxDeviation is the farthest an original point lies from the thinned line', () => {
  const bent = [
    [121, 14.6],
    [121.0005, 14.6001],
    [121.001, 14.6],
  ];
  assert.equal(maxDeviation(ROAD, [ROAD[0], ROAD.at(-1)]) < 0.01, true);
  const d = maxDeviation(bent, [bent[0], bent[2]]);
  assert.ok(d > 10 && d < 12, `about 11 m, got ${d}`);
});

test('the source revisions name every route once and every hotspot, sorted by id', () => {
  const rows = [
    direction({ id: 'v2', route: route({ id: 'r2', revision: 7 }) }),
    direction({ id: 'v1' }),
    direction({ id: 'v3' }),
    direction({ id: 'v4', route: null }),
  ];
  assert.deepEqual(sourceRevisionsOf(rows, [HOTSPOTS[1], HOTSPOTS[0]]), {
    routes: { r1: 3, r2: 7 },
    hotspots: { s1: 1, s2: 2 },
  });
});

test('published_at carries over only when the rows and their revisions are unchanged', () => {
  const rows = { variants: [{ id: 'v1' }], stops: [], links: [] };
  const sourceRevisions = { routes: { r1: 1 }, hotspots: {} };
  const prior = {
    published_at: '2026-10-01T00:00:00Z',
    ...rows,
    source_revisions: sourceRevisions,
  };
  const now = new Date('2026-10-28T12:34:56.789Z');
  assert.equal(publishedAtOf({ prior, rows, sourceRevisions, now }), '2026-10-01T00:00:00Z');
  const moved = { ...rows, links: [{ route_variant_id: 'v1' }] };
  assert.equal(publishedAtOf({ prior, rows: moved, sourceRevisions, now }), '2026-10-28T12:34:56Z');
  const bumped = { routes: { r1: 2 }, hotspots: {} };
  assert.equal(
    publishedAtOf({ prior, rows, sourceRevisions: bumped, now }),
    '2026-10-28T12:34:56Z',
  );
  assert.equal(publishedAtOf({ prior: null, rows, sourceRevisions, now }), '2026-10-28T12:34:56Z');
});

test('only the studio names a board, each is asked for once, in the order first named', () => {
  const { names, boardsOf } = boardsNamed([
    direction({ id: 'v1', signboards: [BOARD_B, 'not-a-uuid.svg', BOARD_A] }),
    direction({ id: 'v2', signboards: [BOARD_A] }),
    direction({ id: 'v3', signboards: null }),
  ]);
  assert.deepEqual(names, [BOARD_B, BOARD_A]);
  assert.deepEqual(
    [...boardsOf],
    [
      ['v1', [BOARD_B, BOARD_A]],
      ['v2', [BOARD_A]],
    ],
  );
});

test('a refused or gone board is left out, told apart, and counted per direction', () => {
  const boardsOf = new Map([
    ['v1', [BOARD_A, BOARD_B]],
    ['v2', [BOARD_B]],
  ]);
  const sorted = sortBoards(
    [
      [BOARD_A, '<svg/>\n'],
      [BOARD_B, { refused: 'Not an SVG file' }],
    ],
    boardsOf,
  );
  assert.deepEqual(
    [...sorted.boardText],
    [
      [BOARD_A, '<svg/>\n'],
      [BOARD_B, null],
    ],
  );
  assert.deepEqual(sorted.refused, [[BOARD_B, 'Not an SVG file']]);
  assert.deepEqual(sorted.gone, []);
  assert.deepEqual([...sorted.boardsOf], [['v1', [BOARD_A]]]);
  assert.equal(sorted.missing, 2);
  const gone = sortBoards([[BOARD_A, null]], new Map([['v1', [BOARD_A]]]));
  assert.deepEqual(gone.gone, [BOARD_A]);
  assert.equal(gone.boardsOf.size, 0);
});

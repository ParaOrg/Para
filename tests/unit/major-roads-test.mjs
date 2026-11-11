// The major-roads file's rules (scripts/major-roads/major-roads.mjs, .scratch/go-here ticket 05):
// trunk, primary and secondary roads only, kept only within Go here's widest walk of a hotspot,
// one entry per name and kind, its split ways chained and simplified by no more than SIMPLIFY_M.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/major-roads-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  REACH_M,
  SIMPLIFY_M,
  inputsFrom,
  joinedLines,
  majorRoadsFrom,
} from '../../scripts/major-roads/major-roads.mjs';
import { WIDER_REACH_M } from '../../src/features/routes/model/one-ride-options.ts';

// One degree of latitude is some 111 km: 0.001° is about 111 m.
const HOTSPOT = [121.05, 14.6];
const way = (osmId, line, extra = {}) => ({
  osmId,
  kind: 'primary',
  name: 'Commonwealth Avenue',
  line,
  ...extra,
});

test('the reach is the widest walk Go here offers', () => {
  assert.equal(REACH_M, WIDER_REACH_M);
});

test('only the stretch within reach of a hotspot is kept', () => {
  // A road running north past the hotspot, 100 m east of it, from 3 km south to 3 km north.
  const line = [-0.027, -0.009, 0, 0.009, 0.027].map((dy) => [121.0509, 14.6 + dy]);
  const [road] = majorRoadsFrom([way(1, line)], [HOTSPOT]);
  assert.deepEqual(road.lines, [
    [
      [121.0509, 14.591],
      [121.0509, 14.609],
    ],
  ]);
  assert.deepEqual(majorRoadsFrom([way(1, line)], [[121.2, 14.6]]), []);
});

test("a road's split ways are one entry, chained end to start in any order", () => {
  const north = [
    [121.0501, 14.6],
    [121.0501, 14.601],
  ];
  const south = [
    [121.0501, 14.599],
    [121.0501, 14.6],
  ];
  const roads = majorRoadsFrom([way(1, north), way(2, south)], [HOTSPOT]);
  assert.equal(roads.length, 1);
  assert.deepEqual(roads[0].lines, [
    [
      [121.0501, 14.599],
      [121.0501, 14.601],
    ],
  ]);
  assert.deepEqual(joinedLines([north, south]), [[south[0], north[0], north[1]]]);
});

test('the same name as another kind, or no name, is another entry; named first', () => {
  const line = [
    [121.0501, 14.6],
    [121.0501, 14.601],
  ];
  const roads = majorRoadsFrom(
    [
      way(1, line, { kind: 'trunk', name: 'EDSA' }),
      way(2, line, { name: null }),
      way(3, line, { name: 'EDSA' }),
    ],
    [HOTSPOT],
  );
  assert.deepEqual(
    roads.map((r) => [r.name, r.kind]),
    [
      ['EDSA', 'trunk'],
      ['EDSA', 'primary'],
      [null, 'primary'],
    ],
  );
});

test('a slight bend is simplified away, a real one is kept', () => {
  const line = (bend) => [
    [121.05, 14.6],
    [121.0505, 14.6 + bend],
    [121.051, 14.6],
  ];
  const [slight] = majorRoadsFrom([way(1, line(0.00001))], [HOTSPOT]);
  assert.equal(slight.lines[0].length, 2);
  const [real] = majorRoadsFrom([way(1, line(0.0001))], [HOTSPOT]);
  assert.equal(real.lines[0].length, 3);
  assert.ok(SIMPLIFY_M > 1.2 && SIMPLIFY_M < 11);
});

test('from osmium: trunk, primary and secondary ways, not their links or smaller roads', () => {
  const feature = (id, highway) => ({
    id,
    geometry: {
      type: 'LineString',
      coordinates: [
        [121, 14.6],
        [121.001, 14.6],
      ],
    },
    properties: { highway, name: ' Quezon Avenue ' },
  });
  const ways = inputsFrom([
    feature('w1', 'primary'),
    feature('w2', 'primary_link'),
    feature('w3', 'tertiary'),
    feature('r4', 'trunk'),
    feature('w5', 'secondary'),
  ]);
  assert.deepEqual(
    ways.map((w) => [w.osmId, w.kind, w.name]),
    [
      [1, 'primary', 'Quezon Avenue'],
      [5, 'secondary', 'Quezon Avenue'],
    ],
  );
});

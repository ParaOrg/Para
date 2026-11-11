// Go here's footbridge hint (src/features/routes/model/footbridge-hint.ts, .scratch/go-here
// ticket 05): the major roads a straight walk crosses, in order, each with the nearest footbridge
// over it within 300 m and on which side; and, on the committed files, every footbridge over a
// road in the major-roads file is found by a walk across it.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/footbridge-hint-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  FOOTBRIDGE_REACH_M,
  footbridgeHints,
  footbridgeHintWords,
} from '../../src/features/routes/model/footbridge-hint.ts';

// A road running north at x = 121.05; 0.001° of latitude is about 111 m.
const AVENUE = {
  name: 'Commonwealth Avenue',
  lines: [
    [
      [121.05, 14.59],
      [121.05, 14.61],
    ],
  ],
};
const footbridgeAt = (lat, extra = {}) => ({
  name: null,
  lines: [
    [
      [121.0498, lat],
      [121.0502, lat],
    ],
  ],
  access: [],
  ...extra,
});
const WEST = [121.049, 14.6];
const EAST = [121.051, 14.6];

test('a walk across the road names the nearest footbridge over it, its side and its elevator', () => {
  const footbridges = [
    footbridgeAt(14.6018),
    footbridgeAt(14.5989, { access: [{ kind: 'elevator' }] }),
  ];
  const [crossing] = footbridgeHints(WEST, EAST, [AVENUE], footbridges);
  assert.equal(crossing.road, 'Commonwealth Avenue');
  assert.equal(crossing.footbridge.side, 'south');
  assert.equal(crossing.footbridge.hasElevator, true);
  assert.ok(Math.abs(crossing.footbridge.distanceM - 122) < 2);
  assert.equal(
    footbridgeHintWords(crossing),
    'Cross Commonwealth Avenue by the footbridge 120 m south (elevator)',
  );
});

test('a walk that stays on one side crosses nothing', () => {
  assert.deepEqual(footbridgeHints(WEST, [121.0495, 14.605], [AVENUE], [footbridgeAt(14.6)]), []);
});

test('no footbridge within reach, or none over this road: crossed with none mapped', () => {
  const far = footbridgeAt(14.6 + (FOOTBRIDGE_REACH_M + 30) / 111000);
  const elsewhere = {
    name: null,
    lines: [
      [
        [121.0505, 14.6],
        [121.0508, 14.6],
      ],
    ],
    access: [],
  };
  const [crossing] = footbridgeHints(WEST, EAST, [AVENUE], [far, elsewhere]);
  assert.equal(crossing.footbridge, null);
  assert.equal(
    footbridgeHintWords(crossing),
    'Crosses Commonwealth Avenue: no footbridge mapped nearby',
  );
});

test("two roads, in the walk's order; a road's two carriageways are one road; no name reads plainly", () => {
  const edsa = (x) => ({
    name: 'EDSA',
    lines: [
      [
        [x, 14.59],
        [x, 14.61],
      ],
    ],
  });
  const unnamed = {
    name: null,
    lines: [
      [
        [121.0495, 14.59],
        [121.0495, 14.61],
      ],
    ],
  };
  const crossings = footbridgeHints(
    EAST,
    WEST,
    [AVENUE, edsa(121.0503), edsa(121.0506), unnamed],
    [],
  );
  assert.deepEqual(
    crossings.map((c) => c.road),
    ['EDSA', 'Commonwealth Avenue', null],
  );
  assert.equal(
    footbridgeHintWords(crossings[2]),
    'Crosses a major road: no footbridge mapped nearby',
  );
});

test('on the committed files, a walk across each footbridge over a mapped road finds it', () => {
  const read = (path) => JSON.parse(readFileSync(path, 'utf8'));
  const roads = read('public/data/major-roads.v1.json').roads;
  const footbridges = read('public/data/footbridges.v1.json').footbridges.map((f) => ({
    name: f.name ?? null,
    lines: f.lines,
    access: f.access ?? [],
  }));
  let found = 0;
  for (const footbridge of footbridges) {
    for (const line of footbridge.lines) {
      for (let i = 1; i < line.length; i++) {
        const crossings = footbridgeHints(line[i - 1], line[i], roads, footbridges);
        if (crossings.length === 0) continue;
        found += 1;
        assert.ok(crossings.every((c) => c.footbridge && c.footbridge.distanceM < 1));
      }
    }
  }
  assert.ok(found > 100, `${found} footbridge segments over a mapped road`);
});

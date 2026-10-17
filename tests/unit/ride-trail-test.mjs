// What the map is handed of a recording (src/features/routes/map/ride-trail.ts):
// a line per leg that has somewhere to go, a dot per switch, and the contributor.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/ride-trail-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { trailData } from '../../src/features/routes/map/ride-trail.ts';

const OUT = [
  [121.0, 14.6],
  [121.001, 14.6],
];
const BACK = [
  [121.001, 14.6],
  [121.0005, 14.6],
];

test('a line per leg, tagged with its direction, and a dot per switch', () => {
  const data = trailData({
    legs: [
      { direction: 'papunta', path: OUT },
      { direction: 'pabalik', path: BACK },
    ],
    markers: [[121.001, 14.6]],
    here: [121.0005, 14.6],
  });
  const lines = data.features.filter((f) => f.geometry.type === 'LineString');
  assert.deepEqual(
    lines.map((f) => f.properties.direction),
    ['papunta', 'pabalik'],
  );
  assert.equal(data.features.filter((f) => f.properties.kind === 'switch').length, 1);
  assert.equal(data.features.filter((f) => f.properties.kind === 'here').length, 1);
});

test('a leg with a single point draws no line, and no fix yet draws no contributor', () => {
  const data = trailData({
    legs: [{ direction: 'papunta', path: [[121.0, 14.6]] }],
    markers: [],
    here: null,
  });
  assert.equal(data.features.length, 0);
});

test('the legs join where one ends and the next begins', () => {
  const data = trailData({
    legs: [
      { direction: 'papunta', path: OUT },
      { direction: 'pabalik', path: BACK },
    ],
    markers: [],
    here: null,
  });
  const [first, second] = data.features;
  assert.deepEqual(first.geometry.coordinates.at(-1), second.geometry.coordinates[0]);
});

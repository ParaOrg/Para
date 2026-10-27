// What the map is handed of a recording (src/features/routes/map/recording-trail.ts):
// a line per leg that has somewhere to go, and a dot per switch.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/recording-trail-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { trailData } from '../../src/features/routes/map/recording-trail.ts';

const OUT = [
  [121.0, 14.6],
  [121.001, 14.6],
];
const BACK = [
  [121.001, 14.6],
  [121.0005, 14.6],
];

test('a line per run, tagged with its way, and a dot per switch', () => {
  const data = trailData({
    lines: [
      { way: 'outbound', path: OUT },
      { way: 'return', path: BACK },
    ],
    markers: [{ at: [121.001, 14.6], way: 'return' }],
    marks: [],
  });
  const lines = data.features.filter((f) => f.geometry.type === 'LineString');
  assert.deepEqual(
    lines.map((f) => f.properties.way),
    ['outbound', 'return'],
  );
  assert.equal(data.features.filter((f) => f.properties.kind === 'switch').length, 1);
});

test('a leg with a single point draws no line', () => {
  const data = trailData({
    lines: [{ way: 'outbound', path: [[121.0, 14.6]] }],
    markers: [],
    marks: [],
  });
  assert.equal(data.features.length, 0);
});

test('the lines join where one ends and the next begins', () => {
  const data = trailData({
    lines: [
      { way: 'outbound', path: OUT },
      { way: 'return', path: BACK },
    ],
    markers: [],
    marks: [],
  });
  const [first, second] = data.features;
  assert.deepEqual(first.geometry.coordinates.at(-1), second.geometry.coordinates[0]);
});

test('a pin per mark, drawn as its own kind of point', () => {
  const data = trailData({
    lines: [{ way: 'outbound', path: OUT }],
    markers: [],
    marks: [{ at: [121.0005, 14.6] }, { at: [121.001, 14.6] }],
  });
  const pins = data.features.filter((f) => f.properties.kind === 'mark');
  assert.deepEqual(
    pins.map((f) => f.geometry.coordinates),
    [
      [121.0005, 14.6],
      [121.001, 14.6],
    ],
  );
});

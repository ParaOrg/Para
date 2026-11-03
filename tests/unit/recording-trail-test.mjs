// What the map is handed of a recording (src/features/routes/map/recording-trail.ts):
// a line per walked or ridden run that has somewhere to go, and a dot per switch.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/recording-trail-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { addRecordingTrail, trailData } from '../../src/features/routes/map/recording-trail.ts';
import { FLAG_IMAGE, FLAG_POINT_X } from '../../src/features/routes/map/trail-flag.ts';

const OUT = [
  [121.0, 14.6],
  [121.001, 14.6],
];
const BACK = [
  [121.001, 14.6],
  [121.0005, 14.6],
];

test('a line per run, tagged with its mode, and a dot per switch', () => {
  const data = trailData({
    lines: [
      { mode: 'walk', path: OUT },
      { mode: 'ride', path: BACK },
    ],
    markers: [{ at: [121.001, 14.6], mode: 'ride' }],
    marks: [],
  });
  const lines = data.features.filter((f) => f.geometry.type === 'LineString');
  assert.deepEqual(
    lines.map((f) => f.properties.mode),
    ['walk', 'ride'],
  );
  assert.equal(data.features.filter((f) => f.properties.kind === 'switch').length, 1);
});

test('a leg with a single point draws no line', () => {
  const data = trailData({
    lines: [{ mode: 'walk', path: [[121.0, 14.6]] }],
    markers: [],
    marks: [],
  });
  assert.equal(data.features.length, 0);
});

test('the lines join where one ends and the next begins', () => {
  const data = trailData({
    lines: [
      { mode: 'walk', path: OUT },
      { mode: 'ride', path: BACK },
    ],
    markers: [],
    marks: [],
  });
  const [first, second] = data.features;
  assert.deepEqual(first.geometry.coordinates.at(-1), second.geometry.coordinates[0]);
});

test('a pin per mark, drawn as its own kind of point', () => {
  const data = trailData({
    lines: [{ mode: 'walk', path: OUT }],
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

test("a flagged stop is Figma's flagstop pin, its point (the stem's foot) on the place", () => {
  const layers = [];
  addRecordingTrail({
    getSource: () => undefined,
    hasImage: () => true,
    addSource: () => {},
    addLayer: (layer) => layers.push(layer),
  });
  const marks = layers.find((l) => l.id === 'recording-trail-marks');
  assert.equal(marks.type, 'symbol');
  assert.equal(marks.layout['icon-image'], FLAG_IMAGE);
  // The image's bottom-left corner on the place, moved left by half the 4 px stem.
  assert.equal(marks.layout['icon-anchor'], 'bottom-left');
  assert.deepEqual(marks.layout['icon-offset'], [-2, 0]);
  assert.equal(FLAG_POINT_X, 2);
  assert.equal(marks.layout['icon-allow-overlap'], true);
  assert.equal(layers.at(-1).id, 'recording-trail-marks', 'drawn over the rest of the trail');
});

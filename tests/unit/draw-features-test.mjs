// What the studio drawing's map sources hold (src/features/studio/drawing/draw-features.ts):
// the segments by their own index, a hotspot's closing edge and fill from
// three corners, the selected point, the U-turns' stretches and rings, and
// the line being picked for Extend with its spot.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/draw-features-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  areaFeatures,
  borrowFeatures,
  handleFeatures,
  handlePoints,
  lineFeatures,
  pointFeatures,
  uTurnFeatures,
} from '../../src/features/studio/drawing/draw-features.ts';
import { CLOSING } from '../../src/features/studio/drawing/draw-layers.ts';

const A = [121.0, 14.7];
const B = [121.01, 14.7];
const C = [121.01, 14.71];
const seg = (snap, ...coordinates) => ({ snap, coordinates });
const AREA = { kind: 'hintuan', hotspotId: null };

test('a segment keeps its own index when one before it has no line yet', () => {
  const { features } = lineFeatures([seg('snapped', A), seg('freehand', B, C)], [A, B, C], null);
  assert.equal(features.length, 1);
  assert.deepEqual(features[0].properties, { index: 1, snap: 'freehand' });
  assert.deepEqual(features[0].geometry, { type: 'LineString', coordinates: [B, C] });
});

test('a hotspot gets its closing edge, last corner to first, from three corners only', () => {
  const two = lineFeatures([seg('freehand', A, B)], [A, B], AREA);
  assert.equal(two.features.length, 1);
  const three = lineFeatures([seg('freehand', A, B), seg('freehand', B, C)], [A, B, C], AREA);
  const closing = three.features.at(-1);
  assert.deepEqual(closing.properties, { index: CLOSING, snap: 'freehand' });
  assert.deepEqual(closing.geometry.coordinates, [C, A]);
  assert.equal(lineFeatures([], [A, B, C], null).features.length, 0, 'a route never closes');
});

test('each point by its index, only the selected one marked', () => {
  const { features } = pointFeatures([A, B, C], 1);
  assert.deepEqual(
    features.map((f) => f.properties),
    [
      { index: 0, selected: false },
      { index: 1, selected: true },
      { index: 2, selected: false },
    ],
  );
  assert.ok(pointFeatures([A], null).features.every((f) => !f.properties.selected));
});

test('a hotspot is filled, its ring closed, from three corners; a route never', () => {
  assert.equal(areaFeatures([A, B], AREA).features.length, 0);
  assert.equal(areaFeatures([A, B, C], null).features.length, 0);
  const { features } = areaFeatures([A, B, C], AREA);
  assert.deepEqual(features[0].geometry, { type: 'Polygon', coordinates: [[A, B, C, A]] });
});

test('each U-turn: its stretch, then a ring at its point while that point exists', () => {
  const uTurns = [
    { point: 1, stub: [A, B], metres: 41.6 },
    { point: 5, stub: [B, C], metres: 10 },
  ];
  const { features } = uTurnFeatures(uTurns, [A, B, C]);
  assert.deepEqual(
    features.map((f) => [f.geometry.type, f.properties.point, f.properties.metres]),
    [
      ['LineString', 1, 42],
      ['LineString', 5, 10],
      ['Point', 1, 42],
    ],
  );
  assert.deepEqual(features[2].geometry.coordinates, B);
});

test('Extend: nothing while not picking; the line, then its spot once one is picked', () => {
  assert.deepEqual(borrowFeatures(null), { type: 'FeatureCollection', features: [] });
  const direction = { shape: { type: 'LineString', coordinates: [A, B, C] } };
  const line = borrowFeatures({ direction, spot: null });
  assert.deepEqual(
    line.features.map((f) => f.geometry.type),
    ['LineString'],
  );
  const spotted = borrowFeatures({ direction, spot: { point: B, metres: 1000 } });
  assert.deepEqual(
    spotted.features.map((f) => f.geometry.type),
    ['LineString', 'Point'],
  );
  assert.deepEqual(spotted.features[1].geometry.coordinates, B);
});

test("handles: the shown points' own, the one in and the one out; none for a hotspot", () => {
  const curve = (from, to, c1, c2) => ({
    snap: 'freehand',
    coordinates: [from, [121.005, 14.702], to],
    handles: [c1, c2],
  });
  const inB = [121.008, 14.701];
  const outB = [121.012, 14.699];
  const segments = [curve(A, B, A, inB), curve(B, C, outB, C)];
  const points = [A, B, C];
  const at = (i) => handleFeatures(segments, points, null, [i], null).features;
  assert.equal(handleFeatures(segments, points, null, [], null).features.length, 0, 'none shown');
  const onB = at(1);
  assert.equal(onB.length, 4, 'an arm and a dot each');
  assert.deepEqual(
    onB.filter((f) => f.geometry.type === 'Point').map((f) => [f.properties.seg, f.properties.end]),
    [
      [0, 1],
      [1, 0],
    ],
  );
  assert.equal(at(0).length, 0, "A's handle lies on it: a corner, none to show");
  assert.equal(handleFeatures(segments, points, AREA, [1], null).features.length, 0, 'a hotspot');
});

test('handles: the last point placed smooth shows the handle it will send, not to be dragged', () => {
  const out = [121.012, 14.701];
  const points = [A, B];
  const features = handleFeatures([seg('freehand', A, B)], points, null, [1], {
    point: B,
    out,
  }).features;
  const dot = features.find((f) => f.geometry.type === 'Point');
  assert.deepEqual(dot?.geometry.coordinates, out);
  assert.equal(dot?.properties.seg, -1);
});

test('handles show on the last two points always, and on the one selected', () => {
  assert.deepEqual(handlePoints(null, 0), []);
  assert.deepEqual(handlePoints(null, 1), [0]);
  assert.deepEqual(handlePoints(null, 5), [3, 4]);
  assert.deepEqual(handlePoints(1, 5), [1, 3, 4]);
  assert.deepEqual(handlePoints(4, 5), [3, 4], 'selected among the last two: once');
});

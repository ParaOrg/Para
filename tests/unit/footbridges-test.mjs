// The footbridge file's rules (scripts/footbridges/footbridges.mjs, .scratch/footbridges ticket
// 01): a footbridge is the footways on a bridge that join one another, kept when one of them
// crosses a road or a rail line, with the elevators and steps that lead up to it.
//
//   node --test tests/unit/footbridges-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ACCESS_M,
  footbridgesFrom,
  inputsFrom,
  joinedWays,
  segmentsCross,
} from '../../scripts/footbridges/footbridges.mjs';

const BOX = { west: 120.9, south: 14.3, east: 121.2, north: 14.8 };
// A road running north at x = 121.05; one degree of latitude is some 111 km.
const ROAD = [
  [121.05, 14.6],
  [121.05, 14.61],
];
const way = (osmId, line, extra = {}) => ({ osmId, line, name: null, isCovered: false, ...extra });
const ACROSS = [
  [121.0498, 14.605],
  [121.0502, 14.605],
];

test('segments cross only when each pair of ends is on opposite sides of the other', () => {
  assert.equal(segmentsCross(...ACROSS, ...ROAD), true);
  // Parallel, beside the road.
  assert.equal(segmentsCross([121.0501, 14.601], [121.0501, 14.609], ...ROAD), false);
  // Stops short of the road.
  assert.equal(segmentsCross([121.0495, 14.605], [121.0499, 14.605], ...ROAD), false);
});

test('ways that share a vertex are one footbridge; apart, two', () => {
  const deck = way(2, ACROSS);
  const ramp = way(1, [ACROSS[1], [121.0505, 14.6052]]);
  const elsewhere = way(3, [
    [121.06, 14.6],
    [121.0605, 14.6],
  ]);
  const groups = joinedWays([deck, ramp, elsewhere]).map((group) => group.map((w) => w.osmId));
  assert.deepEqual(groups.map((ids) => ids.sort()).sort(), [[1, 2], [3]]);
});

test('a footbridge is kept only when it crosses a road or rail, and named by its lowest id', () => {
  const deck = way(20, ACROSS, { name: 'Philcoa Footbridge', isCovered: true });
  const ramp = way(10, [ACROSS[1], [121.0505, 14.6052]]);
  const overACreek = way(30, [
    [121.07, 14.6],
    [121.0702, 14.6],
  ]);
  const [footbridge, ...others] = footbridgesFrom(
    { ways: [deck, ramp, overACreek], crossings: [ROAD], accessPoints: [] },
    BOX,
  );
  assert.equal(others.length, 0);
  assert.equal(footbridge.id, 'w10');
  assert.equal(footbridge.name, 'Philcoa Footbridge');
  assert.equal(footbridge.isCovered, true);
  assert.equal(footbridge.lines.length, 2);
});

test('outside the map box, no footbridge', () => {
  const far = [
    [122.0498, 14.605],
    [122.0502, 14.605],
  ];
  const crossings = [
    [
      [122.05, 14.6],
      [122.05, 14.61],
    ],
  ];
  assert.equal(
    footbridgesFrom({ ways: [way(1, far)], crossings, accessPoints: [] }, BOX).length,
    0,
  );
});

test(`an elevator within ${ACCESS_M} m leads up to the footbridge; a farther one does not`, () => {
  // 0.0001 degrees of latitude is some 11 m.
  const near = { kind: 'elevator', point: [121.0498, 14.6051] };
  const far = { kind: 'elevator', point: [121.0498, 14.6055] };
  const steps = { kind: 'steps', point: [121.0502, 14.6049] };
  const [footbridge] = footbridgesFrom(
    { ways: [way(1, ACROSS)], crossings: [ROAD], accessPoints: [near, far, steps] },
    BOX,
  );
  assert.deepEqual(
    footbridge.access.map((point) => point.kind),
    ['elevator', 'steps'],
  );
});

test("osmium's features sort into footbridge ways, roads and rails, and access points", () => {
  const feature = (id, type, coordinates, properties) => ({
    id,
    geometry: { type, coordinates },
    properties,
  });
  const { ways, crossings, accessPoints } = inputsFrom([
    feature('w1', 'LineString', ACROSS, { highway: 'footway', bridge: 'yes', name: ' Deck ' }),
    feature('w2', 'LineString', ACROSS, { highway: 'footway', bridge: 'no' }),
    feature('w3', 'LineString', ROAD, { highway: 'primary' }),
    feature('w4', 'LineString', ROAD, { railway: 'light_rail', bridge: 'viaduct' }),
    feature('w5', 'LineString', ROAD, { highway: 'residential' }),
    feature('n6', 'Point', [121.05, 14.6], { highway: 'elevator' }),
    feature('n7', 'Point', [121.05, 14.6], { highway: 'crossing' }),
  ]);
  assert.deepEqual(
    ways.map((w) => [w.osmId, w.name]),
    [[1, 'Deck']],
  );
  assert.equal(crossings.length, 2);
  assert.deepEqual(
    accessPoints.map((point) => point.kind),
    ['elevator'],
  );
});

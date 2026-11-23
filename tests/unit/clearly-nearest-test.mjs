// A tap is one route's when its line is clearly the nearest (clearly-nearest.ts): CLEAR_PX nearer
// than any other route's, as the screen draws them. Otherwise every line the finger's box caught
// stays, for the route list. Against a stand-in map whose screen is its coordinates.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/clearly-nearest-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLEAR_PX, clearlyNearest } from '../../src/features/routes/map/clearly-nearest.ts';

const map = { project: ([x, y]) => ({ x, y }) };
/** A direction of `routeId` drawn as a level line at height `y`, from x 0 to 200. */
const line = (id, routeId, y) => ({
  properties: { id, routeId },
  geometry: {
    type: 'LineString',
    coordinates: [
      [0, y],
      [200, y],
    ],
  },
});
const tap = { x: 100, y: 100 };
const routesOf = (features) => [...new Set(features.map((f) => f.properties.routeId))];

test('on one line with another 15 px off, the tap is the near line’s alone', () => {
  const kept = clearlyNearest(map, tap, [line('a-out', 'a', 100), line('b-out', 'b', 115)]);
  assert.deepEqual(routesOf(kept), ['a']);
});

test('where two routes share a road, both stay for the list', () => {
  const both = [line('a-out', 'a', 100), line('b-out', 'b', 103)];
  assert.equal(clearlyNearest(map, tap, both), both);
});

test('midway between two close lines, both stay for the list', () => {
  const both = [line('a-out', 'a', 90), line('b-out', 'b', 110)];
  assert.equal(clearlyNearest(map, tap, both), both);
});

test('just under CLEAR_PX apart is still a question; at CLEAR_PX it is the near one’s', () => {
  const close = [line('a-out', 'a', 100), line('b-out', 'b', 100 + CLEAR_PX - 1)];
  assert.equal(clearlyNearest(map, tap, close), close);
  const clear = [line('a-out', 'a', 100), line('b-out', 'b', 100 + CLEAR_PX)];
  assert.deepEqual(routesOf(clearlyNearest(map, tap, clear)), ['a']);
});

test('a route’s two directions are one: kept together, measured by the nearer', () => {
  const kept = clearlyNearest(map, tap, [
    line('a-out', 'a', 100),
    line('a-back', 'a', 104),
    line('b-out', 'b', 120),
  ]);
  assert.deepEqual(
    kept.map((f) => f.properties.id),
    ['a-out', 'a-back'],
  );
});

test('one route alone, or a feature with no line to measure, keeps what was caught', () => {
  const one = [line('a-out', 'a', 100), line('a-back', 'a', 120)];
  assert.equal(clearlyNearest(map, tap, one), one);
  const unmeasured = [line('a-out', 'a', 100), { properties: { id: 'b-out', routeId: 'b' } }];
  assert.equal(clearlyNearest(map, tap, unmeasured), unmeasured);
});

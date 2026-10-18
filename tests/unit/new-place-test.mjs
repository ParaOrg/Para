// The box of a place made from the save panel (src/features/studio/panels/new-place.ts).
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/new-place-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ringCentroid,
  ringCrossesItself,
  ringToPolygon,
} from '../../src/features/routes/geo/ring.ts';
import { haversine } from '../../src/shared/utils/geo.ts';
import {
  NEW_PLACE_SIDE_M,
  squareBox,
  squareBoxPolygon,
} from '../../src/features/studio/panels/new-place.ts';

const TALA = [121.0432, 14.7589];

test('the box is four corners, 30 m a side, each side of its own length', () => {
  const [sw, se, ne, nw] = squareBox(TALA);
  assert.equal(NEW_PLACE_SIDE_M, 30);
  for (const [a, b] of [
    [sw, se],
    [se, ne],
    [ne, nw],
    [nw, sw],
  ]) {
    assert.ok(Math.abs(haversine(a, b) - 30) < 0.05, String(haversine(a, b)));
  }
});

test('the box is centred on the point it was made at', () => {
  const [lng, lat] = ringCentroid(squareBox(TALA));
  assert.ok(Math.abs(lng - TALA[0]) < 1e-9 && Math.abs(lat - TALA[1]) < 1e-9);
  assert.ok(haversine(ringCentroid(squareBox([120.98, 14.6])), [120.98, 14.6]) < 0.01);
});

test('its sides run north–south and east–west, counter-clockwise from the south-west', () => {
  const [sw, se, ne, nw] = squareBox(TALA);
  assert.equal(sw[1], se[1]);
  assert.equal(ne[1], nw[1]);
  assert.equal(sw[0], nw[0]);
  assert.equal(se[0], ne[0]);
  assert.ok(se[0] > sw[0] && nw[1] > sw[1]);
});

test('the ring crosses itself nowhere, and the polygon the database keeps is closed', () => {
  assert.equal(ringCrossesItself(squareBox(TALA)), false);
  const [ring] = squareBoxPolygon(TALA).coordinates;
  assert.equal(ring.length, 5);
  assert.deepEqual(ring[0], ring[4]);
  assert.deepEqual(squareBoxPolygon(TALA), ringToPolygon(squareBox(TALA)));
});

test('another size is the size asked for', () => {
  const [sw, se] = squareBox(TALA, 50);
  assert.ok(Math.abs(haversine(sw, se) - 50) < 0.1);
});

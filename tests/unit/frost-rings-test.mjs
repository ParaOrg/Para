// The paused frost's layers (src/features/contribute/map/frost-rings.ts): clear round the rider's
// dot, each layer adding what takes the blur to its level, the last whole at the farthest corner.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/frost-rings-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { FROST, frostRings } from '../../src/features/contribute/map/frost-rings.ts';

const map = { width: 390, height: 600 };

test('the layers compound to each level in turn, the last to the full blur', () => {
  const rings = frostRings({ x: 195, y: 300, clearPx: 80, ...map });
  assert.equal(rings.length, FROST.levelsPx.length);
  let squares = 0;
  rings.forEach((ring, index) => {
    squares += ring.blurPx ** 2;
    assert.ok(Math.abs(Math.sqrt(squares) - FROST.levelsPx[index]) < 1e-9, `level ${index}`);
  });
  assert.equal(Math.sqrt(squares), FROST.levelsPx.at(-1));
});

test('clear inside the radius, rings in order, the last whole at the farthest corner', () => {
  const centre = { x: 110, y: 210, clearPx: 80, ...map };
  const rings = frostRings(centre);
  assert.equal(rings[0].fromPx, 80);
  for (let i = 1; i < rings.length; i += 1) assert.equal(rings[i].fromPx, rings[i - 1].toPx);
  const farthest = Math.hypot(map.width - centre.x, map.height - centre.y);
  assert.ok(Math.abs(rings.at(-1).toPx - farthest) < 1e-9);
});

test('a dot off the map still clears round it and frosts all the map', () => {
  const rings = frostRings({ x: -50, y: 700, clearPx: 80, ...map });
  // Its farthest corner, the top right, is where the last layer is whole.
  assert.ok(Math.abs(rings.at(-1).toPx - Math.hypot(map.width + 50, 700)) < 1e-9);
});

test('a clear radius wider than the map still gives rings that grow', () => {
  const rings = frostRings({ x: 195, y: 300, clearPx: 2000, ...map });
  assert.ok(rings.every((ring) => ring.toPx > ring.fromPx));
});

test('three levels are three layers: FROST.levelsPx is the one place to tune', () => {
  const rings = frostRings({ x: 195, y: 300, clearPx: 80, ...map }, [3, 6, 8]);
  assert.deepEqual(
    rings.map((ring) => ring.levelPx),
    [3, 6, 8],
  );
});

// Use this line and Draw a hintuan here, apart from the browser: the upload's
// line thinned to what the router is asked for, and the box a hinto starts.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/contribution-start-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  boxAround,
  controlPointsOf,
} from '../../src/features/studio/contributors/actions/contribution-start.ts';
import { pointInRing } from '../../src/features/routes/geo/ring.ts';

/** A wandering line north, a point every ~10 m, 600 of them. */
const wander = Array.from({ length: 600 }, (_, i) => [
  121.05 + Math.sin(i / 20) * 0.0004,
  14.7 + i * 0.00009,
]);

test('a long line becomes few control points, ends kept, in order', () => {
  const points = controlPointsOf(wander);
  assert.ok(points.length >= 2 && points.length <= 25, `${points.length} points`);
  assert.deepEqual(points[0], wander[0]);
  assert.deepEqual(points.at(-1), wander.at(-1));
  for (let i = 1; i < points.length; i += 1) assert.ok(points[i][1] > points[i - 1][1]);
});

test('a straight line needs only its two ends', () => {
  const straight = Array.from({ length: 50 }, (_, i) => [121.05, 14.7 + i * 0.0001]);
  assert.equal(controlPointsOf(straight).length, 2);
});

test('the box a hinto starts surrounds it, four corners, about 40 m across', () => {
  const at = [121.06, 14.68];
  const box = boxAround(at);
  assert.equal(box.length, 4);
  assert.ok(pointInRing(at, box));
  assert.ok(!pointInRing([121.06, 14.6806], box), 'a point 60 m north is outside');
  assert.ok(pointInRing([121.06, 14.6801], box), 'a point 11 m north is inside');
});

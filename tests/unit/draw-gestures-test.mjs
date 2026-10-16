// The studio drawing pointer's arithmetic (src/features/studio/drawing/draw-gestures.ts):
// the ids under a tap, the point nearest a finger, the modes round a point,
// a dragged point's rubber band, and the one router request for the gaps
// round a moved or put-back point. The handlers that use them are
// studio-phone-test's and the drawing suites'.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/draw-gestures-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  featureIds,
  gapsAround,
  modesAround,
  nearestWithin,
  rubberBand,
  waitingGapsAround,
} from '../../src/features/studio/drawing/draw-gestures.ts';

const seg = (snap, a, b) => ({ snap, coordinates: [a, b] });
const P = [
  [0, 0],
  [1, 0],
  [2, 0],
];
const S = [seg('snapped', P[0], P[1]), seg('straight', P[1], P[2])];

test('featureIds: each string id once, in the order met; others dropped', () => {
  const ids = featureIds([
    { properties: { id: 'b' } },
    { properties: { id: 'a' } },
    { properties: { id: 'b' } },
    { properties: { id: 7 } },
    { properties: null },
    {},
  ]);
  assert.deepEqual(ids, ['b', 'a']);
});

test('nearestWithin: the nearer of two inside reach, none outside, the later of two as near', () => {
  const at = { x: 0, y: 0 };
  assert.equal(
    nearestWithin(
      [
        { x: 15, y: 0 },
        { x: 5, y: 0 },
      ],
      at,
      20,
    ),
    1,
  );
  assert.equal(nearestWithin([{ x: 25, y: 0 }], at, 20), null);
  assert.equal(nearestWithin([{ x: 20, y: 0 }], at, 20), 0);
  assert.equal(
    nearestWithin(
      [
        { x: 3, y: 0 },
        { x: 0, y: 3 },
      ],
      at,
      20,
    ),
    1,
  );
  assert.equal(nearestWithin([], at, 20), null);
});

test('modesAround: the stretch before and after; none past either end', () => {
  assert.deepEqual(modesAround(S, 0), [undefined, 'snapped']);
  assert.deepEqual(modesAround(S, 1), ['snapped', 'straight']);
  assert.deepEqual(modesAround(S, 2), ['straight', undefined]);
});

test('rubberBand: a middle point moves, both its stretches straight to it in their modes', () => {
  const to = [1, 1];
  const r = rubberBand(P, S, 1, to, ['snapped', 'straight'], null);
  assert.deepEqual(r.points, [P[0], to, P[2]]);
  assert.deepEqual(r.segments, [seg('snapped', P[0], to), seg('straight', to, P[2])]);
  assert.equal(r.standIns.length, 2);
  assert.equal(r.standIns[0], r.segments[0]);
  assert.equal(r.join, null);
  assert.deepEqual(P[1], [1, 0], 'the points given are not changed');
});

test('rubberBand: the first and the last point band their one stretch; a mode missing is snapped', () => {
  const first = rubberBand(P, S, 0, [0, 1], [undefined, undefined], null);
  assert.deepEqual(first.segments[0], seg('snapped', [0, 1], P[1]));
  assert.equal(first.segments[1], S[1]);
  assert.equal(first.standIns.length, 1);
  const last = rubberBand(P, S, 2, [2, 1], ['straight', undefined], null);
  assert.deepEqual(last.segments[1], seg('straight', P[1], [2, 1]));
  assert.equal(last.standIns.length, 1);
});

test('rubberBand: the join is replaced only when it is the point moved, by identity', () => {
  const to = [1, 1];
  assert.equal(rubberBand(P, S, 1, to, [undefined, undefined], P[1]).join, to);
  assert.equal(rubberBand(P, S, 0, to, [undefined, undefined], P[1]).join, P[1]);
  const twin = [1, 0];
  assert.equal(rubberBand(P, S, 1, to, [undefined, undefined], twin).join, twin);
});

test('gapsAround: before and after for a middle point, one side at an end, none for a lone point', () => {
  assert.deepEqual(gapsAround(1, 2, ['snapped', 'straight']), {
    from: 0,
    modes: ['snapped', 'straight'],
  });
  assert.deepEqual(gapsAround(0, 2, [undefined, 'straight']), { from: 0, modes: ['straight'] });
  assert.deepEqual(gapsAround(2, 2, ['straight', undefined]), { from: 1, modes: ['straight'] });
  assert.deepEqual(gapsAround(1, 2, [undefined, undefined]), {
    from: 0,
    modes: ['snapped', 'snapped'],
  });
  assert.equal(gapsAround(0, 0, [undefined, undefined]), null);
});

test('waitingGapsAround: only the stretches still waiting, as one request', () => {
  const [a, b] = S;
  const waiting = (set) => (s) => set.includes(s);
  assert.equal(waitingGapsAround(a, b, 1, waiting([])), null);
  assert.deepEqual(waitingGapsAround(a, b, 1, waiting([a])), { from: 0, modes: ['snapped'] });
  assert.deepEqual(waitingGapsAround(a, b, 1, waiting([b])), { from: 1, modes: ['straight'] });
  assert.deepEqual(waitingGapsAround(a, b, 1, waiting([a, b])), {
    from: 0,
    modes: ['snapped', 'straight'],
  });
  assert.deepEqual(waitingGapsAround(undefined, b, 0, waiting([b])), {
    from: 0,
    modes: ['straight'],
  });
});

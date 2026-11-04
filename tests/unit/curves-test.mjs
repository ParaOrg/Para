// Curves in Draw (src/features/studio/drawing/curves.ts): a Draw stretch bent
// by two handles, flattened into its line; split by an inserted point, healed
// round a deleted one, carried by a dragged one; and the handle a smooth point
// sends its next stretch.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/curves-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CURVE_STEPS,
  bend,
  carryHandles,
  curveSegment,
  keptFirstHandle,
  mergeAcross,
  mirror,
  outHandle,
  splitCurve,
} from '../../src/features/studio/drawing/curves.ts';
import { moveHandle, toggleSmooth } from '../../src/features/studio/drawing/curve-handles.ts';
import { insertInGap, removeAt } from '../../src/features/studio/drawing/drawing-edits.ts';
import { rubberBand } from '../../src/features/studio/drawing/draw-gestures.ts';

const A = [121.0, 14.7];
const B = [121.01, 14.7];
const C = [121.02, 14.7];
const UP = [121.0, 14.705];
const near = (p, q, eps = 1e-9) => Math.abs(p[0] - q[0]) < eps && Math.abs(p[1] - q[1]) < eps;

test('a curve is a Draw stretch, its ends exact, its handles kept, flattened into its line', () => {
  const s = curveSegment(A, B, UP, [121.01, 14.705]);
  assert.equal(s.snap, 'freehand');
  assert.equal(s.coordinates.length, CURVE_STEPS);
  assert.deepEqual(s.coordinates[0], A);
  assert.deepEqual(s.coordinates.at(-1), B);
  assert.deepEqual(s.handles, [UP, [121.01, 14.705]]);
  // It bows toward its handles: its middle is north of the chord.
  assert.ok(s.coordinates[CURVE_STEPS >> 1][1] > 14.7);
});

test('with both handles on their points it is a plain straight stretch', () => {
  assert.deepEqual(curveSegment(A, B, A, B), { snap: 'freehand', coordinates: [A, B] });
});

test("a smooth point's handles mirror round it", () => {
  assert.ok(near(mirror([121.001, 14.701], A), [120.999, 14.699]));
});

test('bend keeps a curve, straightens anything else, and never bends a routed stretch', () => {
  const curve = curveSegment(A, B, UP, B);
  assert.deepEqual(bend(curve, A, C).handles, [UP, B]);
  assert.deepEqual(bend(undefined, A, B), { snap: 'freehand', coordinates: [A, B] });
  assert.equal(
    bend({ snap: 'snapped', coordinates: [A, B], handles: [UP, B] }, A, B).handles,
    undefined,
  );
});

test('a point moved carries its own handle, the far one staying', () => {
  const curve = curveSegment(A, B, UP, [121.01, 14.705]);
  const moved = [121.0, 14.701];
  assert.deepEqual(carryHandles(curve, true, A, moved)?.[1], [121.01, 14.705]);
  assert.ok(near(carryHandles(curve, true, A, moved)[0], [121.0, 14.706]));
  assert.ok(near(carryHandles(curve, false, B, [121.011, 14.7])[1], [121.011, 14.705]));
  assert.equal(carryHandles({ snap: 'snapped', coordinates: [A, B] }, true, A, moved), undefined);
});

test('rubberBand keeps a dragged point’s curves bent, the handle at it moved with it', () => {
  const curve = curveSegment(A, B, UP, [121.01, 14.705]);
  const to = [121.0, 14.701];
  const r = rubberBand([A, B], [curve], 0, to, [undefined, 'freehand'], null);
  assert.deepEqual(r.segments[0].coordinates[0], to);
  assert.ok(near(r.segments[0].handles[0], [121.0, 14.706]));
  assert.deepEqual(r.segments[0].handles[1], [121.01, 14.705]);
});

test('a curve split by de Casteljau: two curves meeting on it, tracing the one', () => {
  const curve = curveSegment(A, B, UP, [121.01, 14.705]);
  const mid = curve.coordinates[CURVE_STEPS >> 1];
  const [first, second] = splitCurve(curve, mid);
  assert.deepEqual(first.coordinates[0], A);
  assert.deepEqual(second.coordinates.at(-1), B);
  assert.ok(near(first.coordinates.at(-1), second.coordinates[0]));
  assert.ok(near(first.coordinates.at(-1), mid, 1e-12));
  assert.equal(splitCurve({ snap: 'freehand', coordinates: [A, B] }, A), null);
});

test('inserting on a curve splits it there, asking the router nothing', () => {
  const curve = curveSegment(A, B, UP, [121.01, 14.705]);
  const click = curve.coordinates[6];
  const edit = insertInGap([A, B], [curve], 0, [click[0] + 1e-6, click[1]]);
  assert.equal(edit.points.length, 3);
  assert.equal(edit.resolve, null);
  assert.ok(near(edit.points[1], click, 1e-12), 'the point sits on the curve, not beside it');
  assert.ok(edit.segments.every((s) => s.handles));
});

test('deleting the point between two curves heals them into one with the outer handles', () => {
  const h1 = [121.0, 14.703];
  const h4 = [121.02, 14.703];
  const first = curveSegment(A, B, h1, [121.009, 14.702]);
  const second = curveSegment(B, C, [121.011, 14.698], h4);
  assert.deepEqual(mergeAcross(first, second, A, C).handles, [h1, h4]);
  assert.deepEqual(removeAt([A, B, C], [first, second], 1).segments[0].handles, [h1, h4]);
  assert.equal(
    mergeAcross(
      { snap: 'freehand', coordinates: [A, B] },
      { snap: 'freehand', coordinates: [B, C] },
      A,
      C,
    ),
    null,
  );
});

test("the handle a point sends its next stretch: the drag's, else its smooth mirror, else none", () => {
  const out = [121.011, 14.701];
  assert.deepEqual(outHandle(B, undefined, { point: B, out }), out);
  assert.equal(outHandle(B, undefined, { point: [...B], out }), null, 'by identity');
  const smoothIn = curveSegment(A, B, A, [121.009, 14.699]);
  assert.ok(near(outHandle(B, smoothIn, null), [121.011, 14.701]));
  assert.equal(outHandle(B, curveSegment(A, B, UP, B), null), null, 'a corner sends none');
});

test('a lone first point keeps the handle it drew with when its stretch goes', () => {
  const out = [121.001, 14.702];
  assert.deepEqual(keptFirstHandle(curveSegment(A, B, out, B), A), out);
  assert.equal(keptFirstHandle(curveSegment(A, B, A, [121.009, 14.702]), A), null, 'a corner');
  assert.equal(keptFirstHandle({ snap: 'snapped', coordinates: [A, B] }, A), null);
});

test('a handle dragged bends its stretch, and its partner across the point mirrors it', () => {
  const first = curveSegment(A, B, A, [121.009, 14.701]);
  const second = curveSegment(B, C, [121.011, 14.699], C);
  const to = [121.008, 14.703];
  const next = moveHandle([first, second], { seg: 0, end: 1 }, to, false);
  assert.deepEqual(next[0].handles[1], to);
  assert.ok(near(next[1].handles[0], [121.012, 14.697], 1e-9));
  const alone = moveHandle([first, second], { seg: 0, end: 1 }, to, true);
  assert.deepEqual(alone[1], second, 'Alt moves it alone');
});

test('a routed stretch never bends, even beside a dragged handle', () => {
  const first = curveSegment(A, B, A, [121.009, 14.701]);
  const routed = { snap: 'snapped', coordinates: [B, C] };
  const next = moveHandle([first, routed], { seg: 0, end: 1 }, [121.008, 14.703], false);
  assert.equal(next[1], routed);
});

test('double-click: a corner turns smooth along the line, a smooth point back to a corner', () => {
  const straight = [
    { snap: 'freehand', coordinates: [A, UP] },
    { snap: 'freehand', coordinates: [UP, C] },
  ];
  const smooth = toggleSmooth(straight, [A, UP, C], 1);
  assert.ok(
    smooth.every((s) => s.handles),
    'both stretches bend at it',
  );
  // The two handles lie on one line through the point: mirrored in direction.
  const [h1, h2] = [smooth[0].handles[1], smooth[1].handles[0]];
  const cross = (h1[0] - UP[0]) * (h2[1] - UP[1]) - (h1[1] - UP[1]) * (h2[0] - UP[0]);
  assert.ok(Math.abs(cross) < 1e-12);
  const corner = toggleSmooth(smooth, [A, UP, C], 1);
  assert.ok(
    corner.every((s) => s.coordinates.length === 2 && !s.handles),
    'straight again',
  );
});

test("the line's end handles move alone: there is nothing across them to mirror", () => {
  const only = curveSegment(A, B, [121.001, 14.701], [121.009, 14.701]);
  const start = moveHandle([only], { seg: 0, end: 0 }, [121.002, 14.703], false);
  assert.deepEqual(start[0].handles[0], [121.002, 14.703]);
  const end = moveHandle([only], { seg: 0, end: 1 }, [121.008, 14.703], false);
  assert.deepEqual(end[0].handles[1], [121.008, 14.703]);
  assert.equal(end.length, 1);
});

test('a routed stretch has no handle to move, and turns no Draw partner', () => {
  const routed = { snap: 'snapped', coordinates: [A, B] };
  const curve = curveSegment(B, C, [121.011, 14.701], C);
  const next = moveHandle([routed, curve], { seg: 0, end: 1 }, [121.009, 14.703], false);
  assert.equal(next[0], routed);
  assert.equal(next[1], curve);
});

test('double-click at either end, and beside a routed stretch, bends only Draw', () => {
  const draw = { snap: 'freehand', coordinates: [A, B] };
  const routed = { snap: 'snapped', coordinates: [B, C] };
  const first = toggleSmooth([draw, routed], [A, B, C], 0);
  assert.ok(first[0].handles, 'the first point turns smooth along its stretch');
  assert.equal(first[1], routed);
  const middle = toggleSmooth([draw, routed], [A, B, C], 1);
  assert.ok(middle[0].handles);
  assert.equal(middle[1], routed, 'the routed side is left as it is');
  const last = [draw, { snap: 'freehand', coordinates: [B, C] }];
  assert.ok(toggleSmooth(last, [A, B, C], 2)[1].handles, 'the last point too');
});

test('a double-click with no Draw stretch beside it changes nothing: the same array', () => {
  const routed = [
    { snap: 'snapped', coordinates: [A, B] },
    { snap: 'snapped', coordinates: [B, C] },
  ];
  assert.equal(toggleSmooth(routed, [A, B, C], 1), routed);
});

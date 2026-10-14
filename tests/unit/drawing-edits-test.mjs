// The drawing's edits (src/features/studio/drawing/drawing-edits.ts): the
// array arithmetic behind addPoint before a join, insertPoint, deletePoint,
// a hotspot's ring and the runs of gaps still waiting for the router.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/drawing-edits-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addBeforeJoin,
  insertInGap,
  removeAt,
  ringSegments,
  waitingRuns,
} from '../../src/features/studio/drawing/drawing-edits.ts';

/** A point at [lng, 14.7]: one object per call, so identity can be checked. */
const pt = (lng) => [lng, 14.7];
/** A routed segment between two points, as the router would have answered. */
const routed = (a, b) => ({ snap: 'snapped', coordinates: [a, b, [b[0], b[1] + 0.001]] });
/** A straight stretch, the owner's choice. */
const straight = (a, b) => ({ snap: 'freehand', coordinates: [a, b] });
/**
 * Every element the very object expected, not a copy: the join point and a
 * right-click's join are held by identity (joinRef, connectedRef), so an edit
 * that copied a kept point or segment would lose them.
 */
const sameObjects = (actual, expected) => {
  assert.equal(actual.length, expected.length);
  expected.forEach((o, i) => assert.equal(actual[i], o));
};
/** A drawing of `n` points joined by routed gaps. */
const line = (n) => {
  const points = Array.from({ length: n }, (_, i) => pt(121 + i / 100));
  const segments = points.slice(1).map((p, i) => routed(points[i], p));
  return { points, segments };
};

test('insertInGap splits one gap into two straight ones and asks for both in its mode', () => {
  const { points, segments } = line(3);
  const p = pt(121.005);
  const e = insertInGap(points, segments, 0, p);
  sameObjects(e.points, [points[0], p, points[1], points[2]]);
  assert.equal(e.segments.length, 3);
  assert.deepEqual(e.segments[0], straight(points[0], p));
  assert.deepEqual(e.segments[1], straight(p, points[1]));
  assert.equal(e.segments[2], segments[1]);
  assert.deepEqual(e.resolve, { from: 0, modes: ['snapped', 'snapped'] });
  // The gap's own mode, so a straight stretch stays straight on both sides.
  const f = insertInGap(points, [straight(points[0], points[1]), segments[1]], 0, p);
  assert.deepEqual(f.resolve, { from: 0, modes: ['freehand', 'freehand'] });
  // The inputs are not touched.
  assert.equal(points.length, 3);
  assert.equal(segments.length, 2);
});

test('removeAt the first or last point drops its one gap and asks for nothing', () => {
  const { points, segments } = line(3);
  const first = removeAt(points, segments, 0);
  sameObjects(first.points, [points[1], points[2]]);
  sameObjects(first.segments, [segments[1]]);
  assert.equal(first.resolve, null);
  const last = removeAt(points, segments, 2);
  sameObjects(last.points, [points[0], points[1]]);
  sameObjects(last.segments, [segments[0]]);
  assert.equal(last.resolve, null);
});

test('removeAt a middle point heals its two gaps into one, asked for in the mode before, else after, else snapped', () => {
  const { points, segments } = line(4);
  const e = removeAt(points, segments, 1);
  sameObjects(e.points, [points[0], points[2], points[3]]);
  assert.deepEqual(e.segments, [straight(points[0], points[2]), segments[2]]);
  assert.equal(e.segments[1], segments[2]);
  assert.deepEqual(e.resolve, { from: 0, modes: ['snapped'] });
  const before = [straight(points[0], points[1]), segments[1], segments[2]];
  assert.deepEqual(removeAt(points, before, 1).resolve, { from: 0, modes: ['freehand'] });
  const after = [segments[0], straight(points[1], points[2]), segments[2]];
  assert.deepEqual(removeAt(points, after, 1).resolve, { from: 0, modes: ['snapped'] });
  // With the gap before missing, the one after says; with neither, snapped.
  const sparse = [];
  sparse[1] = straight(points[1], points[2]);
  sparse[2] = segments[2];
  assert.deepEqual(removeAt(points, sparse, 1).resolve, { from: 0, modes: ['freehand'] });
  assert.deepEqual(removeAt(points, [], 1).resolve, { from: 0, modes: ['snapped'] });
});

test('addBeforeJoin at join 0 puts the point first with one new gap; mid-line, two', () => {
  const { points, segments } = line(3);
  const join = points[0];
  const p = pt(120.99);
  const e = addBeforeJoin(points, segments, 0, p, 'snapped');
  assert.deepEqual(e.points, [p, points[0], points[1], points[2]]);
  assert.deepEqual(e.segments, [straight(p, points[0]), segments[0], segments[1]]);
  assert.deepEqual(e.resolve, { from: 0, modes: ['snapped'] });
  // The join point is the same object after, where joinRef's indexOf finds it.
  assert.equal(e.points.indexOf(join), 1);

  const mid = points[1];
  const q = pt(121.005);
  const f = addBeforeJoin(points, segments, 1, q, 'freehand');
  assert.deepEqual(f.points, [points[0], q, points[1], points[2]]);
  assert.deepEqual(f.segments, [straight(points[0], q), straight(q, points[1]), segments[1]]);
  assert.deepEqual(f.resolve, { from: 0, modes: ['freehand', 'freehand'] });
  assert.equal(f.points.indexOf(mid), 2);
});

test('ringSegments of a four-corner ring is three straight segments', () => {
  const ring = [pt(121), pt(121.01), pt(121.02), pt(121.03)];
  const segs = ringSegments(ring);
  assert.deepEqual(segs, [
    straight(ring[0], ring[1]),
    straight(ring[1], ring[2]),
    straight(ring[2], ring[3]),
  ]);
  assert.deepEqual(ringSegments([pt(121)]), []);
  assert.deepEqual(ringSegments([]), []);
});

test('waitingRuns finds none, one, two separated runs and a run reaching the last gap', () => {
  const { segments } = line(7);
  const waiting = new Set();
  const isWaiting = (s) => waiting.has(s);
  assert.deepEqual(waitingRuns(segments, isWaiting), []);
  waiting.add(segments[1]);
  waiting.add(segments[2]);
  assert.deepEqual(waitingRuns(segments, isWaiting), [[1, 2]]);
  waiting.add(segments[4]);
  assert.deepEqual(waitingRuns(segments, isWaiting), [
    [1, 2],
    [4, 4],
  ]);
  waiting.add(segments[5]);
  assert.deepEqual(waitingRuns(segments, isWaiting), [
    [1, 2],
    [4, 5],
  ]);
  // A draft's pending flag is the same question asked of the stored segments.
  const pending = segments.map((s, i) => (i === 0 ? { ...s, pending: true } : s));
  assert.deepEqual(
    waitingRuns(pending, (s) => !!s.pending),
    [[0, 0]],
  );
});

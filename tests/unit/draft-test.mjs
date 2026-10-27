// The drawing's draft (src/features/studio/drawing/draft.ts): what a reload
// restores from it, and the stored shape the suites and check-build read.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/draft-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readDraft, restoredState } from '../../src/features/studio/drawing/draft.ts';

const KEY = 'para.draft.v1';

/** A point at [lng, 14.7]: one object per call, so identity can be checked. */
const pt = (lng) => [lng, 14.7];
/** A routed segment between two points, with the roads it follows. */
const routed = (a, b) => ({ snap: 'snapped', coordinates: [a, b], streets: [] });
/** A stand-in still waiting for the router when the draft was written. */
const pending = (a, b) => ({ snap: 'snapped', coordinates: [a, b], pending: true });

/** The stored draft under a fake localStorage for the test, as a page would read it. */
const stored = (raw) => {
  const store = new Map(raw === null ? [] : [[KEY, raw]]);
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => store.set(k, v),
    removeItem: (k) => store.delete(k),
  };
};

test('restoredState strips pending to a plain segment and asks for its run again', () => {
  const points = [pt(121), pt(121.01), pt(121.02), pt(121.03)];
  const segments = [
    routed(points[0], points[1]),
    pending(points[1], points[2]),
    pending(points[2], points[3]),
  ];
  const r = restoredState({
    controlPoints: points,
    segments,
    target: { routeId: 'r1', directionId: 'd1' },
  });
  assert.equal(r.controlPoints, points);
  assert.equal(r.segments[0], segments[0]);
  assert.deepEqual(r.segments[1], { snap: 'snapped', coordinates: [points[1], points[2]] });
  assert.equal('pending' in r.segments[2], false);
  assert.deepEqual(r.pendingRuns, [[1, 2]]);
  assert.deepEqual(r.target, { routeId: 'r1', directionId: 'd1' });
  assert.equal(r.area, null);
  assert.equal(r.borrow, null);
  assert.equal(r.join, null);
});

test('restoredState resolves the join index to the very point, and keeps the borrow', () => {
  const points = [pt(121), pt(121.01), pt(121.02)];
  const r = restoredState({
    controlPoints: points,
    segments: [routed(points[0], points[1]), routed(points[1], points[2])],
    target: { routeId: null, directionId: null },
    borrow: { directionId: 'd9', part: 'end' },
    join: 1,
  });
  assert.equal(r.join, points[1]);
  assert.deepEqual(r.borrow, { directionId: 'd9', part: 'end' });
  assert.equal(
    restoredState({ controlPoints: points, segments: [], target: r.target, join: 7 }).join,
    null,
  );
});

test('restoredState asks for nothing for an area, however its edges were stored', () => {
  const ring = [pt(121), pt(121.01), pt(121.02)];
  const r = restoredState({
    controlPoints: ring,
    segments: [pending(ring[0], ring[1]), pending(ring[1], ring[2])],
    target: { routeId: null, directionId: null },
    area: { kind: 'terminal', hotspotId: 'h1' },
  });
  assert.deepEqual(r.area, { kind: 'terminal', hotspotId: 'h1' });
  assert.deepEqual(r.pendingRuns, []);
  assert.equal('pending' in r.segments[0], false);
});

test('readDraft reads the stored words (variantId, stopId) as directionId and hotspotId', () => {
  stored(
    JSON.stringify({
      controlPoints: [pt(121), pt(121.01)],
      segments: [routed(pt(121), pt(121.01))],
      target: { routeId: 'r1', variantId: 'd1' },
      area: { kind: 'hintuan', stopId: 'h2' },
      borrow: { variantId: 'd3', part: 'start' },
      join: 0,
    }),
  );
  const d = readDraft();
  assert.deepEqual(d.target, { routeId: 'r1', directionId: 'd1' });
  assert.deepEqual(d.area, { kind: 'hintuan', hotspotId: 'h2' });
  assert.deepEqual(d.borrow, { directionId: 'd3', part: 'start' });
  assert.equal(d.join, 0);
  assert.equal(d.controlPoints.length, 2);
  assert.equal('variantId' in d.target, false);
});

test('readDraft is null with nothing stored, something unreadable, or a draft with no points', () => {
  stored(null);
  assert.equal(readDraft(), null);
  stored('{not json');
  assert.equal(readDraft(), null);
  stored(
    JSON.stringify({ controlPoints: [], segments: [], target: { routeId: null, variantId: null } }),
  );
  assert.equal(readDraft(), null);
  stored(JSON.stringify({ target: { routeId: null, variantId: null } }));
  assert.equal(readDraft(), null);
});

// Where the drawing's chevrons flow (src/features/studio/drawing/draw-arrows.ts):
// along its drawn stretches, routed and Draw's alike, a run of them as one
// line, never on a stand-in, and never on a hotspot.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/draw-arrows-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { drawnRuns } from '../../src/features/studio/drawing/draw-arrows.ts';

const A = [121.0, 14.7];
const B = [121.01, 14.7];
const C = [121.01, 14.71];
const D = [121.02, 14.71];
const E = [121.02, 14.72];
const seg = (snap, ...coordinates) => ({ snap, coordinates });
const AREA = { kind: 'hintuan', hotspotId: null };

test('snapped segments next to each other are one run, the join not doubled', () => {
  assert.deepEqual(drawnRuns([seg('snapped', A, B), seg('snapped', B, C)], null), [[A, B, C]]);
});

test("Draw's stretches carry chevrons too, one run with the routed ones beside them", () => {
  const segments = [seg('snapped', A, B), seg('freehand', B, C), seg('snapped', C, D, E)];
  assert.deepEqual(drawnRuns(segments, null), [[A, B, C, D, E]]);
});

test('a segment with no line yet splits the runs too', () => {
  assert.deepEqual(drawnRuns([seg('snapped', A, B), undefined, seg('snapped', C, D)], null), [
    [A, B],
    [C, D],
  ]);
  assert.deepEqual(drawnRuns([seg('snapped', A)], null), []);
});

test('a hotspot has no way, so no chevrons', () => {
  assert.deepEqual(drawnRuns([seg('snapped', A, B)], AREA), []);
});

test('a run is a copy: the drawing is never changed', () => {
  const first = seg('snapped', A, B);
  drawnRuns([first, seg('snapped', B, C)], null);
  assert.deepEqual(first.coordinates, [A, B]);
});

test('a stand-in waiting for the router is not road yet: no chevrons on it', () => {
  const standIn = seg('snapped', B, C);
  const runs = drawnRuns(
    [seg('snapped', A, B), standIn, seg('snapped', C, D)],
    null,
    (s) => s === standIn,
  );
  assert.deepEqual(runs, [
    [A, B],
    [C, D],
  ]);
});

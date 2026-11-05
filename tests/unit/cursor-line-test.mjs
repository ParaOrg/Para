// Draw's line to the cursor (src/features/studio/drawing/use-cursor-line.ts):
// the stretch a click there would add, and none where Draw adds nothing.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/cursor-line-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { curveSegment } from '../../src/features/studio/drawing/curves.ts';
import { cursorLine } from '../../src/features/studio/drawing/use-cursor-line.ts';

const A = [121.0, 14.7];
const B = [121.01, 14.7];
const C = [121.02, 14.7];
const ref = (current) => ({ current });
const refsOf = (over = {}) => ({
  points: ref([A]),
  segments: ref([]),
  freehand: ref(true),
  area: ref(null),
  picking: ref(null),
  join: ref(null),
  pendingOut: ref(null),
  ...over,
});

test('from a corner: straight from the last point to the cursor', () => {
  assert.deepEqual(cursorLine(refsOf(), B), [A, B]);
});

test("after a smooth point: bent along its handle, as a click's stretch would be", () => {
  const out = [121.001, 14.702];
  const line = cursorLine(refsOf({ pendingOut: ref({ point: A, out }) }), B);
  assert.deepEqual(line, curveSegment(A, B, out, B).coordinates);
});

test('before a borrowed end: straight from the point a click goes in after', () => {
  assert.deepEqual(cursorLine(refsOf({ points: ref([A, C]), join: ref(C) }), B), [A, B]);
});

test('none in Snap, for a hotspot, while picking, or before anything is drawn', () => {
  assert.equal(cursorLine(refsOf({ freehand: ref(false) }), B), null);
  assert.equal(cursorLine(refsOf({ area: ref({ kind: 'terminal', hotspotId: null }) }), B), null);
  assert.equal(cursorLine(refsOf({ picking: ref({ direction: {}, spot: null }) }), B), null);
  assert.equal(cursorLine(refsOf({ points: ref([]) }), B), null);
});

// Where Snap's live preview routes from (src/features/studio/drawing/use-snap-preview.ts):
// the last point, or the one just ahead of a borrowed end where clicks go in;
// nothing in Draw, for a hotspot, while picking, or before anything is drawn.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/snap-preview-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { previewFrom } from '../../src/features/studio/drawing/use-snap-preview.ts';

const A = [121.0, 14.7];
const B = [121.01, 14.7];
const C = [121.01, 14.71];

test('from the last point drawn', () => {
  assert.equal(previewFrom([A, B, C], null, true), C);
});

test('before a borrowed end, from the point just ahead of the join', () => {
  assert.equal(previewFrom([A, B, C], B, true), A);
});

test('a join that is the first point has nothing ahead of it to route from', () => {
  assert.equal(previewFrom([A, B, C], A, true), null);
});

test('nothing before a point is drawn, and nothing when not snapping', () => {
  assert.equal(previewFrom([], null, true), null);
  assert.equal(previewFrom([A, B], null, false), null);
});

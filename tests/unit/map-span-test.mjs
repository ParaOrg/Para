// How far a flagged stop's map zooms (src/features/contribute/stop-notes/map-span.ts): about
// 200 m across its width, wherever the stop is.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/map-span-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { STOP_MAP_SPAN_M, zoomForSpan } from '../../src/features/contribute/stop-notes/map-span.ts';

/** Metres one pixel spans at `zoom`, at latitude `lat`, on MapLibre's 512 px tiles. */
const metresPerPixel = (lat, zoom) =>
  (40_075_016.686 * Math.cos((lat * Math.PI) / 180)) / (512 * 2 ** zoom);

test('the zoom puts STOP_MAP_SPAN_M across the map, in Manila', () => {
  const zoom = zoomForSpan(14.65, 361, STOP_MAP_SPAN_M);
  assert.ok(Math.abs(metresPerPixel(14.65, zoom) * 361 - STOP_MAP_SPAN_M) < 0.01);
  assert.ok(zoom > 16.5 && zoom < 17.5, `zoom ${zoom}`);
});

test('a wider map zooms in further to show the same 200 m', () => {
  assert.ok(zoomForSpan(14.65, 722, 200) > zoomForSpan(14.65, 361, 200));
});

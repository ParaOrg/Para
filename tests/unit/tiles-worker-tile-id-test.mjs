// The tiles Worker's tile-id maths (workers/tiles/src/pmtiles.ts) against the PMTiles spec's
// own values and the spike's independent reader.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/tiles-worker-tile-id-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isValidTile, zxyToTileId } from '../../workers/tiles/src/pmtiles.ts';
import { tileIdToZxy, zxyToTileId as spikeTileId } from '../../scripts/research/tiles-pmtiles.mjs';

test('tile ids follow the spec: zoom levels stack, each level is a Hilbert curve', () => {
  assert.equal(zxyToTileId(0, 0, 0), 0);
  assert.equal(zxyToTileId(1, 0, 0), 1);
  assert.equal(zxyToTileId(1, 0, 1), 2);
  assert.equal(zxyToTileId(1, 1, 1), 3);
  assert.equal(zxyToTileId(1, 1, 0), 4);
  assert.equal(zxyToTileId(2, 0, 0), 5);
});

test('every tile to zoom 5 gets its own id, and the ids round-trip', () => {
  const seen = new Set();
  for (let z = 0; z <= 5; z += 1) {
    for (let x = 0; x < 2 ** z; x += 1) {
      for (let y = 0; y < 2 ** z; y += 1) {
        const id = zxyToTileId(z, x, y);
        assert.equal(id, spikeTileId(z, x, y));
        assert.deepEqual(tileIdToZxy(id), [z, x, y]);
        seen.add(id);
      }
    }
  }
  assert.equal(seen.size, (4 ** 6 - 1) / 3);
});

test('the ids of Metro Manila at zoom 14 agree with the spike', () => {
  for (const [x, y] of [
    [13701, 7513],
    [13698, 7520],
    [13700, 7522],
  ]) {
    assert.equal(zxyToTileId(14, x, y), spikeTileId(14, x, y));
  }
});

test('a tile address must be whole numbers inside its zoom level', () => {
  assert.equal(isValidTile(14, 13701, 7513), true);
  assert.equal(isValidTile(0, 0, 0), true);
  assert.equal(isValidTile(0, 1, 0), false);
  assert.equal(isValidTile(3, 8, 0), false);
  assert.equal(isValidTile(3, -1, 0), false);
  assert.equal(isValidTile(1.5, 0, 0), false);
  assert.equal(isValidTile(23, 0, 0), false);
  assert.equal(isValidTile(Number.NaN, 0, 0), false);
});

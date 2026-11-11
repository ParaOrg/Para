// The tiles around a point (src/features/contribute/map/tiles-around.ts), which the contributor app
// keeps when a ride starts so its map draws with no signal later.
//
//   node --experimental-strip-types --import ./scripts/node/ts-resolve.mjs tests/unit/tiles-around-test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { tilesAround, tileUrl } from '../../src/features/contribute/map/tiles-around.ts';

/** UP Diliman's Oblation, as [lng, lat]. */
const OBLATION = [121.0657, 14.6544];

// Checked against x = floor((lng + 180) / 360 * 2^z), y = floor((1 - asinh(tan(lat)) / pi) / 2 * 2^z).
test('the point itself is in its tile at every zoom', () => {
  const tiles = tilesAround(OBLATION, 0, 10, 14);
  assert.deepEqual(tiles, [
    { z: 10, x: 856, y: 469 },
    { z: 11, x: 1712, y: 939 },
    { z: 12, x: 3425, y: 1879 },
    { z: 13, x: 6850, y: 3758 },
    { z: 14, x: 13701, y: 7517 },
  ]);
});

test('six kilometres round it is a few dozen tiles, coarse zooms first', () => {
  const tiles = tilesAround(OBLATION, 6000, 10, 14);
  assert.ok(tiles.length > 20 && tiles.length < 120, `${tiles.length} tiles`);
  assert.deepEqual(
    tiles.map((t) => t.z),
    [...tiles.map((t) => t.z)].sort((a, b) => a - b),
  );
  // At zoom 14 a tile is about 2.4 km wide here: 12 km across is a 6 or 7 tile square.
  const z14 = tiles.filter((t) => t.z === 14);
  assert.ok(z14.length >= 25 && z14.length <= 49, `${z14.length} tiles at z14`);
});

test('a tile address fills the source template', () => {
  assert.equal(
    tileUrl('https://tiles.example/{z}/{x}/{y}.pbf?v=1', { z: 14, x: 13701, y: 7517 }),
    'https://tiles.example/14/13701/7517.pbf?v=1',
  );
});

// The elevation stand-in's tile (tests/e2e/lib/flat-terrain-tile.mjs) decoded as MapLibre decodes a
// Terrarium tile: a 256×256 PNG, every pixel 0 m.
import assert from 'node:assert/strict';
import test from 'node:test';
import { crc32, inflateSync } from 'node:zlib';

import { flatTerrainTile, TILE_SIZE } from '../e2e/lib/flat-terrain-tile.mjs';

/** A PNG's chunks, each CRC checked. */
const chunksOf = (png) => {
  assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunks = [];
  for (let at = 8; at < png.length;) {
    const length = png.readUInt32BE(at);
    const body = png.subarray(at + 4, at + 8 + length);
    assert.equal(png.readUInt32BE(at + 8 + length), crc32(body), 'CRC');
    chunks.push({ type: body.subarray(0, 4).toString('ascii'), data: body.subarray(4) });
    at += 12 + length;
  }
  return chunks;
};

test('the flat tile is a 256×256 8-bit RGB PNG whose every pixel Terrarium reads as 0 m', () => {
  const chunks = chunksOf(flatTerrainTile());
  assert.deepEqual(
    chunks.map((c) => c.type),
    ['IHDR', 'IDAT', 'IEND'],
  );
  const header = chunks[0].data;
  assert.equal(header.readUInt32BE(0), TILE_SIZE);
  assert.equal(header.readUInt32BE(4), TILE_SIZE);
  assert.deepEqual([...header.subarray(8)], [8, 2, 0, 0, 0]);

  const pixels = inflateSync(chunks[1].data);
  const stride = 1 + TILE_SIZE * 3;
  assert.equal(pixels.length, TILE_SIZE * stride);
  const heights = new Set();
  for (let y = 0; y < TILE_SIZE; y++) {
    assert.equal(pixels[y * stride], 0, 'row unfiltered');
    for (let x = 0; x < TILE_SIZE; x++) {
      const [r, g, b] = pixels.subarray(y * stride + 1 + x * 3, y * stride + 4 + x * 3);
      heights.add(r * 256 + g + b / 256 - 32768);
    }
  }
  assert.deepEqual([...heights], [0]);
});

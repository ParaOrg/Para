// The studio's elevation tiles, standing in: one made-up 256×256 PNG whose every pixel is the
// colour Mapzen's Terrarium encoding reads as 0 m (height = R × 256 + G + B / 256 − 32768, so
// R 128, G 0, B 0). The ground it gives is flat and unshaded by design: no suite reads heights
// or shading today. A check that comes to read them needs real tiles, recorded, not these.
// Made here with node:zlib, so no binary is kept in the repository.
import { crc32, deflateSync } from 'node:zlib';

export const TILE_SIZE = 256;
/** The colour Terrarium reads as 0 m. */
export const SEA_LEVEL = [128, 0, 0];

/** A PNG chunk: its length, its type and data, and their CRC. */
const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** The flat tile, an 8-bit RGB PNG, every row unfiltered. */
export const flatTerrainTile = () => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(TILE_SIZE, 0);
  header.writeUInt32BE(TILE_SIZE, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8 bits, RGB, deflate, no filter method, not interlaced
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.alloc(TILE_SIZE * 3).map((_, i) => SEA_LEVEL[i % 3]),
  ]);
  const pixels = Buffer.concat(Array.from({ length: TILE_SIZE }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

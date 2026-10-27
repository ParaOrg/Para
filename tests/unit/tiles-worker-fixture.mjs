// A tiny PMTiles v3 file and a fake R2 bucket for the tiles Worker's unit checks.
// Not a test itself (the runner only picks up *-test.mjs).
import { gzipSync } from 'node:zlib';

import { zxyToTileId } from '../../workers/tiles/src/pmtiles.ts';

function varint(value) {
  const out = [];
  let rest = value;
  while (rest >= 0x80) {
    out.push((rest % 0x80) | 0x80);
    rest = Math.floor(rest / 0x80);
  }
  out.push(rest);
  return out;
}

function directory(entries) {
  const bytes = [...varint(entries.length)];
  let last = 0;
  for (const e of entries) {
    bytes.push(...varint(e.tileId - last));
    last = e.tileId;
  }
  for (const e of entries) bytes.push(...varint(e.runLength));
  for (const e of entries) bytes.push(...varint(e.length));
  for (const e of entries) bytes.push(...varint(e.offset + 1));
  return gzipSync(Buffer.from(bytes));
}

/** The bytes a tile holds in the fixture, so a test can tell the tiles apart. */
export function tileBody(z, x, y) {
  return gzipSync(Buffer.from(`tile ${z}/${x}/${y}`));
}

/** A PMTiles v3 file with the given tiles, their entries split into leaf directories. */
export function buildPmtiles(tiles, { leafSize = 2, bounds = [120.6, 14.1, 121.5, 15.05] } = {}) {
  const sorted = tiles
    .map(([z, x, y]) => ({ z, x, y, tileId: zxyToTileId(z, x, y), body: tileBody(z, x, y) }))
    .sort((a, b) => a.tileId - b.tileId);
  let dataOffset = 0;
  const entries = sorted.map((t) => {
    const entry = { tileId: t.tileId, offset: dataOffset, length: t.body.length, runLength: 1 };
    dataOffset += t.body.length;
    return entry;
  });
  const leaves = [];
  for (let i = 0; i < entries.length; i += leafSize) leaves.push(entries.slice(i, i + leafSize));
  const leafBytes = leaves.map(directory);
  let leafOffset = 0;
  const rootEntries = leaves.map((leaf, i) => {
    const entry = {
      tileId: leaf[0].tileId,
      offset: leafOffset,
      length: leafBytes[i].length,
      runLength: 0,
    };
    leafOffset += leafBytes[i].length;
    return entry;
  });
  const root = directory(rootEntries);
  const metadata = gzipSync(Buffer.from('{}'));
  const rootAt = 127;
  const metaAt = rootAt + root.length;
  const leafAt = metaAt + metadata.length;
  const dataAt = leafAt + leafOffset;

  const header = Buffer.alloc(127);
  header.write('PMTiles', 0, 'latin1');
  header[7] = 3;
  header.writeBigUInt64LE(BigInt(rootAt), 8);
  header.writeBigUInt64LE(BigInt(root.length), 16);
  header.writeBigUInt64LE(BigInt(metaAt), 24);
  header.writeBigUInt64LE(BigInt(metadata.length), 32);
  header.writeBigUInt64LE(BigInt(leafAt), 40);
  header.writeBigUInt64LE(BigInt(leafOffset), 48);
  header.writeBigUInt64LE(BigInt(dataAt), 56);
  header.writeBigUInt64LE(BigInt(dataOffset), 64);
  header.writeBigUInt64LE(BigInt(sorted.length), 72);
  header[97] = 2; // internal compression: gzip
  header[98] = 2; // tile compression: gzip
  header[99] = 1; // tile type: mvt
  header[100] = Math.min(...tiles.map((t) => t[0]));
  header[101] = Math.max(...tiles.map((t) => t[0]));
  bounds.forEach((degrees, i) => header.writeInt32LE(Math.round(degrees * 1e7), 102 + i * 4));
  return Buffer.concat([header, root, metadata, ...leafBytes, ...sorted.map((t) => t.body)]);
}

/** An in-memory R2 bucket that counts reads; ranges are clamped to the object like R2's. */
export function fakeBucket(files) {
  const bucket = {
    reads: [],
    files,
    async get(key, options) {
      bucket.reads.push(key);
      const data = files.get(key);
      if (!data) return null;
      const part = options?.range
        ? data.subarray(options.range.offset, options.range.offset + options.range.length)
        : data;
      const copy = new Uint8Array(part);
      return {
        arrayBuffer: async () => copy.buffer,
        body: new Response(copy).body,
        httpEtag: `"${key}"`,
        size: copy.length,
      };
    },
  };
  return bucket;
}

/** A Cache API stand-in keyed by URL. */
export function fakeCache() {
  const store = new Map();
  const urlOf = (request) => (typeof request === 'string' ? request : request.url);
  return {
    store,
    async match(request) {
      return store.get(urlOf(request))?.clone();
    },
    async put(request, response) {
      store.set(urlOf(request), response);
    },
  };
}

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

function directory(entries, contiguousOffsets) {
  const bytes = [...varint(entries.length)];
  let last = 0;
  for (const e of entries) {
    bytes.push(...varint(e.tileId - last));
    last = e.tileId;
  }
  for (const e of entries) bytes.push(...varint(e.runLength));
  for (const e of entries) bytes.push(...varint(e.length));
  entries.forEach((e, i) => {
    const previous = entries[i - 1];
    const follows = previous && e.offset === previous.offset + previous.length;
    // 0 means "right after the previous entry's data", the spec's compact form.
    bytes.push(...varint(contiguousOffsets && follows ? 0 : e.offset + 1));
  });
  return gzipSync(Buffer.from(bytes));
}

/**
 * The bytes a tile holds in the fixture, so a test can tell the tiles apart. A tile given a
 * fourth element holds that text instead, and consecutive tile ids holding the same text
 * share one directory entry (a run).
 */
export function tileBody(z, x, y, shared) {
  return gzipSync(Buffer.from(shared ?? `tile ${z}/${x}/${y}`));
}

/**
 * A PMTiles v3 file with the given tiles. Entries are split into leaf directories of
 * `leafSize`; `levels` of them stack (2 = the root points at leaves that point at leaves).
 */
export function buildPmtiles(
  tiles,
  {
    leafSize = 2,
    levels = 1,
    contiguousOffsets = false,
    bounds = [120.6, 14.1, 121.5, 15.05],
  } = {},
) {
  const sorted = tiles
    .map(([z, x, y, shared]) => ({
      shared,
      tileId: zxyToTileId(z, x, y),
      body: tileBody(z, x, y, shared),
    }))
    .sort((a, b) => a.tileId - b.tileId);
  let dataOffset = 0;
  const entries = [];
  for (const t of sorted) {
    const last = entries[entries.length - 1];
    if (
      t.shared !== undefined &&
      last?.shared === t.shared &&
      last.tileId + last.runLength === t.tileId
    ) {
      last.runLength += 1;
      continue;
    }
    entries.push({
      shared: t.shared,
      tileId: t.tileId,
      offset: dataOffset,
      length: t.body.length,
      runLength: 1,
      body: t.body,
    });
    dataOffset += t.body.length;
  }
  const leafBytes = [];
  let leafOffset = 0;
  let level = entries;
  for (let depth = 0; depth < levels; depth += 1) {
    const pointers = [];
    for (let i = 0; i < level.length; i += leafSize) {
      const chunk = level.slice(i, i + leafSize);
      const bytes = directory(chunk, contiguousOffsets);
      pointers.push({
        tileId: chunk[0].tileId,
        offset: leafOffset,
        length: bytes.length,
        runLength: 0,
      });
      leafBytes.push(bytes);
      leafOffset += bytes.length;
    }
    level = pointers;
  }
  const root = directory(level, contiguousOffsets);
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
  return Buffer.concat([header, root, metadata, ...leafBytes, ...entries.map((e) => e.body)]);
}

/**
 * An in-memory R2 bucket that counts reads. Ranges are clamped to the object like R2's, and a
 * range read with `onlyIf.etagMatches` answers without a body when the file was replaced.
 */
export function fakeBucket(files) {
  const versions = new Map();
  const bucket = {
    reads: [],
    files,
    /** Replaces a file, as a new upload under the same name would. */
    replace(key, data) {
      files.set(key, data);
      versions.set(key, (versions.get(key) ?? 0) + 1);
    },
    async get(key, options) {
      bucket.reads.push(key);
      const data = files.get(key);
      if (!data) return null;
      const etag = `${key}@${versions.get(key) ?? 0}`;
      const meta = { etag, httpEtag: `"${etag}"`, size: data.length };
      const wanted = options?.onlyIf?.etagMatches;
      if (wanted !== undefined && wanted !== etag) return meta;
      const part = options?.range
        ? data.subarray(options.range.offset, options.range.offset + options.range.length)
        : data;
      const copy = new Uint8Array(part);
      return { ...meta, arrayBuffer: async () => copy.buffer, body: new Response(copy).body };
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

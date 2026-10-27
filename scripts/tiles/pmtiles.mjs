// A small PMTiles v3 reader: header, metadata, directories, tile bytes. The monthly tiles build
// uses it to check the file; it is a script, not an app dependency, so nothing is added to package.json.
import { closeSync, openSync, readSync, fstatSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';

const HEADER_BYTES = 127;
const COMPRESSION_GZIP = 2;

/** The Hilbert curve's id for a tile, the order PMTiles sorts its entries by. */
export function zxyToTileId(z, x, y) {
  let acc = 0;
  for (let t = 0; t < z; t += 1) acc += 4 ** t;
  const n = 2 ** z;
  let d = 0;
  let tx = x;
  let ty = y;
  for (let s = n / 2; s >= 1; s /= 2) {
    const rx = (tx & s) > 0 ? 1 : 0;
    const ry = (ty & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) {
        tx = n - 1 - tx;
        ty = n - 1 - ty;
      }
      [tx, ty] = [ty, tx];
    }
  }
  return acc + d;
}

export function tileIdToZxy(id) {
  let acc = 0;
  for (let z = 0; z < 32; z += 1) {
    const count = 4 ** z;
    if (acc + count > id) {
      const n = 2 ** z;
      let t = id - acc;
      let x = 0;
      let y = 0;
      for (let s = 1; s < n; s *= 2) {
        const rx = 1 & (t / 2);
        const ry = 1 & (t ^ rx);
        if (ry === 0) {
          if (rx === 1) {
            x = s - 1 - x;
            y = s - 1 - y;
          }
          [x, y] = [y, x];
        }
        x += s * rx;
        y += s * ry;
        t = Math.floor(t / 4);
      }
      return [z, x, y];
    }
    acc += count;
  }
  throw new Error('tile id out of range');
}

function readVarint(buf, pos) {
  let result = 0;
  let shift = 0;
  for (;;) {
    const byte = buf[pos.at++];
    result += (byte & 0x7f) * 2 ** shift;
    if (byte < 0x80) return result;
    shift += 7;
  }
}

function parseDirectory(raw) {
  const pos = { at: 0 };
  const count = readVarint(raw, pos);
  const entries = new Array(count);
  let lastId = 0;
  for (let i = 0; i < count; i += 1) {
    lastId += readVarint(raw, pos);
    entries[i] = { tileId: lastId, offset: 0, length: 0, runLength: 0 };
  }
  for (const e of entries) e.runLength = readVarint(raw, pos);
  for (const e of entries) e.length = readVarint(raw, pos);
  for (let i = 0; i < count; i += 1) {
    const v = readVarint(raw, pos);
    entries[i].offset = v === 0 && i > 0 ? entries[i - 1].offset + entries[i - 1].length : v - 1;
  }
  return entries;
}

export class PmtilesFile {
  constructor(path) {
    this.fd = openSync(path, 'r');
    this.bytes = fstatSync(this.fd).size;
    const h = this.#read(0, HEADER_BYTES);
    if (h.toString('latin1', 0, 7) !== 'PMTiles' || h[7] !== 3)
      throw new Error('not a PMTiles v3 file');
    const u64 = (o) => Number(h.readBigUInt64LE(o));
    this.header = {
      rootOffset: u64(8),
      rootLength: u64(16),
      metadataOffset: u64(24),
      metadataLength: u64(32),
      leafOffset: u64(40),
      dataOffset: u64(56),
      addressedTiles: u64(72),
      internalCompression: h[97],
      tileCompression: h[98],
      minZoom: h[100],
      maxZoom: h[101],
      west: h.readInt32LE(102) / 1e7,
      south: h.readInt32LE(106) / 1e7,
      east: h.readInt32LE(110) / 1e7,
      north: h.readInt32LE(114) / 1e7,
    };
  }

  #read(offset, length) {
    const buf = Buffer.alloc(length);
    readSync(this.fd, buf, 0, length, offset);
    return buf;
  }

  #directory(offset, length) {
    const raw = this.#read(offset, length);
    return parseDirectory(
      this.header.internalCompression === COMPRESSION_GZIP ? gunzipSync(raw) : raw,
    );
  }

  metadata() {
    const raw = this.#read(this.header.metadataOffset, this.header.metadataLength);
    const text = this.header.internalCompression === COMPRESSION_GZIP ? gunzipSync(raw) : raw;
    return JSON.parse(text.toString('utf8'));
  }

  /** Every tile entry as `{ tileId, offset, length }`, one per tile (runs are expanded). */
  *entries(directory = this.#directory(this.header.rootOffset, this.header.rootLength)) {
    for (const e of directory) {
      if (e.runLength === 0) {
        yield* this.entries(this.#directory(this.header.leafOffset + e.offset, e.length));
      } else {
        for (let r = 0; r < e.runLength; r += 1) {
          yield { tileId: e.tileId + r, offset: e.offset, length: e.length };
        }
      }
    }
  }

  /** The tile's bytes as stored (gzipped for Planetiler's output), or null if there is none. */
  tile(z, x, y) {
    const id = zxyToTileId(z, x, y);
    let dir = this.#directory(this.header.rootOffset, this.header.rootLength);
    for (let depth = 0; depth < 4; depth += 1) {
      let lo = 0;
      let hi = dir.length - 1;
      let found = null;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (dir[mid].tileId <= id) {
          found = dir[mid];
          lo = mid + 1;
        } else hi = mid - 1;
      }
      if (!found) return null;
      if (found.runLength > 0) {
        if (id >= found.tileId + found.runLength) return null;
        return this.#read(this.header.dataOffset + found.offset, found.length);
      }
      dir = this.#directory(this.header.leafOffset + found.offset, found.length);
    }
    return null;
  }

  close() {
    closeSync(this.fd);
  }
}

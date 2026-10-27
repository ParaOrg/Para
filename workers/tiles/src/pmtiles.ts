// PMTiles v3: the header, the directories and the tile-id order. Pure; no I/O.
// Spec: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md

export const HEADER_BYTES = 127;
// The spec keeps the header and the root directory inside the first 16 kB.
export const ROOT_READ_BYTES = 16384;
export const COMPRESSION_NONE = 1;
export const COMPRESSION_GZIP = 2;
const MAX_ZOOM = 22;
export const MAX_DIRECTORY_DEPTH = 3;

export interface PmtilesHeader {
  rootOffset: number;
  rootLength: number;
  leafOffset: number;
  dataOffset: number;
  internalCompression: number;
  tileCompression: number;
  minZoom: number;
  maxZoom: number;
  bounds: [west: number, south: number, east: number, north: number];
}

export interface DirectoryEntry {
  tileId: number;
  offset: number;
  length: number;
  runLength: number;
}

export type TileLocation =
  | { kind: 'tile'; offset: number; length: number }
  | { kind: 'leaf'; offset: number; length: number }
  | { kind: 'none' };

/** The Hilbert-curve id of a tile: the order PMTiles sorts its entries by. */
export function zxyToTileId(z: number, x: number, y: number): number {
  let id = 0;
  for (let t = 0; t < z; t += 1) id += 4 ** t;
  const n = 2 ** z;
  let tx = x;
  let ty = y;
  for (let s = n / 2; s >= 1; s /= 2) {
    const rx = (tx & s) > 0 ? 1 : 0;
    const ry = (ty & s) > 0 ? 1 : 0;
    id += s * s * ((3 * rx) ^ ry);
    if (ry === 0) {
      if (rx === 1) {
        tx = n - 1 - tx;
        ty = n - 1 - ty;
      }
      [tx, ty] = [ty, tx];
    }
  }
  return id;
}

/** Whether z/x/y is a tile address at all (not whether the file holds it). */
export function isValidTile(z: number, x: number, y: number): boolean {
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > MAX_ZOOM) return false;
  const n = 2 ** z;
  return x >= 0 && x < n && y >= 0 && y < n;
}

export function parseHeader(bytes: Uint8Array): PmtilesHeader {
  if (bytes.length < HEADER_BYTES) throw new Error('PMTiles header is truncated');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(...bytes.subarray(0, 7));
  if (magic !== 'PMTiles' || bytes[7] !== 3) throw new Error('not a PMTiles v3 file');
  const u64 = (at: number): number => Number(view.getBigUint64(at, true));
  const degrees = (at: number): number => view.getInt32(at, true) / 1e7;
  return {
    rootOffset: u64(8),
    rootLength: u64(16),
    leafOffset: u64(40),
    dataOffset: u64(56),
    internalCompression: view.getUint8(97),
    tileCompression: view.getUint8(98),
    minZoom: view.getUint8(100),
    maxZoom: view.getUint8(101),
    bounds: [degrees(102), degrees(106), degrees(110), degrees(114)],
  };
}

function readVarint(bytes: Uint8Array, cursor: { at: number }): number {
  let result = 0;
  for (let shift = 0; ; shift += 7) {
    const byte = bytes[cursor.at];
    if (byte === undefined) throw new Error('PMTiles directory is truncated');
    cursor.at += 1;
    // Multiplying, not shifting: offsets can pass 2^31.
    result += (byte & 0x7f) * 2 ** shift;
    if (byte < 0x80) return result;
  }
}

/** A directory's entries, from its decompressed bytes. */
export function parseDirectory(bytes: Uint8Array): DirectoryEntry[] {
  const cursor = { at: 0 };
  const count = readVarint(bytes, cursor);
  const entries: DirectoryEntry[] = [];
  let tileId = 0;
  for (let i = 0; i < count; i += 1) {
    tileId += readVarint(bytes, cursor);
    entries.push({ tileId, offset: 0, length: 0, runLength: 0 });
  }
  for (const entry of entries) entry.runLength = readVarint(bytes, cursor);
  for (const entry of entries) entry.length = readVarint(bytes, cursor);
  entries.forEach((entry, i) => {
    const value = readVarint(bytes, cursor);
    const previous = entries[i - 1];
    entry.offset = value === 0 && previous ? previous.offset + previous.length : value - 1;
  });
  return entries;
}

/** Where `tileId` is within one directory: in the data, in a leaf directory, or nowhere. */
export function locate(entries: DirectoryEntry[], tileId: number): TileLocation {
  let low = 0;
  let high = entries.length - 1;
  let found: DirectoryEntry | undefined;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const entry = entries[mid];
    if (entry && entry.tileId <= tileId) {
      found = entry;
      low = mid + 1;
    } else high = mid - 1;
  }
  if (!found) return { kind: 'none' };
  if (found.runLength === 0) return { kind: 'leaf', offset: found.offset, length: found.length };
  if (tileId >= found.tileId + found.runLength) return { kind: 'none' };
  return { kind: 'tile', offset: found.offset, length: found.length };
}

import { TILES_PREFIX } from './keys';
import {
  COMPRESSION_GZIP,
  HEADER_BYTES,
  MAX_DIRECTORY_DEPTH,
  ROOT_READ_BYTES,
  locate,
  parseDirectory,
  parseHeader,
  zxyToTileId,
} from './pmtiles';
import type { DirectoryEntry, PmtilesHeader } from './pmtiles';
import { isBody } from './types';
import type { EdgeCache, R2Bucket } from './types';

type Bytes = Uint8Array<ArrayBuffer>;

export interface Tile {
  bytes: ArrayBuffer;
  isGzip: boolean;
}

export interface Archive {
  header: PmtilesHeader;
  /** The tile as stored, or null when the file holds none at this address. */
  getTile(z: number, x: number, y: number): Promise<Tile | null>;
}

/** The file in R2 is no longer the one the archive was opened on; open it again. */
export class StaleArchiveError extends Error {}

interface Range {
  bytes: Bytes;
  etag: string;
}

async function readRange(
  bucket: R2Bucket,
  key: string,
  offset: number,
  length: number,
  etag?: string,
): Promise<Range> {
  const object = await bucket.get(key, {
    range: { offset, length },
    ...(etag ? { onlyIf: { etagMatches: etag } } : {}),
  });
  if (!object) throw new Error(`${key} is missing from the bucket`);
  if (!isBody(object)) throw new StaleArchiveError(`${key} changed after it was opened`);
  return { bytes: new Uint8Array(await object.arrayBuffer()), etag: object.etag };
}

async function gunzip(bytes: Bytes): Promise<Bytes> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * Opens one PMTiles file in R2. The header and root directory are read once and kept for the
 * isolate's life; every later read is conditional on the file's etag, so a file replaced under
 * the same name fails with StaleArchiveError instead of mixing two builds. Leaf directories go
 * through `cache`, which keeps entries only on a custom domain.
 */
export async function openArchive(
  bucket: R2Bucket,
  file: string,
  cache: EdgeCache | undefined,
): Promise<Archive> {
  const key = `${TILES_PREFIX}${file}`;
  const { bytes: first, etag } = await readRange(bucket, key, 0, ROOT_READ_BYTES);
  const header = parseHeader(first.subarray(0, HEADER_BYTES));
  const inflate = async (raw: Bytes): Promise<Bytes> =>
    header.internalCompression === COMPRESSION_GZIP ? gunzip(raw) : raw;
  const rootEnd = header.rootOffset + header.rootLength;
  if (rootEnd > first.length) throw new Error('PMTiles root directory is past the first 16 kB');
  const root = parseDirectory(await inflate(first.subarray(header.rootOffset, rootEnd)));

  async function leaf(offset: number, length: number): Promise<DirectoryEntry[]> {
    const cacheKey = `https://tiles.internal/directory/${file}/${etag}/${offset}/${length}`;
    const hit = await cache?.match(cacheKey);
    if (hit) return parseDirectory(new Uint8Array(await hit.arrayBuffer()));
    const raw = await readRange(bucket, key, header.leafOffset + offset, length, etag);
    const bytes = await inflate(raw.bytes);
    await cache?.put(
      cacheKey,
      new Response(bytes, { headers: { 'Cache-Control': 'max-age=2592000' } }),
    );
    return parseDirectory(bytes);
  }

  return {
    header,
    async getTile(z, x, y) {
      if (z < header.minZoom || z > header.maxZoom) return null;
      const tileId = zxyToTileId(z, x, y);
      let entries = root;
      for (let depth = 0; depth <= MAX_DIRECTORY_DEPTH; depth += 1) {
        const where = locate(entries, tileId);
        if (where.kind === 'none') return null;
        if (where.kind === 'tile') {
          const data = await readRange(
            bucket,
            key,
            header.dataOffset + where.offset,
            where.length,
            etag,
          );
          return {
            bytes: data.bytes.slice().buffer,
            isGzip: header.tileCompression === COMPRESSION_GZIP,
          };
        }
        entries = await leaf(where.offset, where.length);
      }
      return null;
    },
  };
}

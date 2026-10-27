import { CURRENT_KEY } from './keys';
import { isBody } from './types';
import type { R2Bucket } from './types';

const CURRENT_TTL_MS = 5 * 60 * 1000;
const FILE_NAME = /^parapo-[0-9A-Za-z._-]+\.pmtiles$/;

export interface Current {
  file: string;
  builtAt: string;
  tiles: number;
}

function parseCurrent(value: unknown): Current {
  if (typeof value !== 'object' || value === null) throw new Error('current.json is not an object');
  const { file, builtAt, tiles }: Record<string, unknown> = Object.fromEntries(
    Object.entries(value),
  );
  if (typeof file !== 'string' || !FILE_NAME.test(file))
    throw new Error('current.json names no PMTiles file');
  if (typeof builtAt !== 'string') throw new Error('current.json has no builtAt');
  return { file, builtAt, tiles: typeof tiles === 'number' ? tiles : 0 };
}

/** Reads `current.json` at most once every five minutes per isolate. */
export function createCurrentReader(
  bucket: R2Bucket,
  now: () => number = Date.now,
): () => Promise<Current> {
  let cached: { value: Current; readAt: number } | undefined;
  return async () => {
    if (cached && now() - cached.readAt < CURRENT_TTL_MS) return cached.value;
    try {
      const object = await bucket.get(CURRENT_KEY);
      if (!object || !isBody(object)) throw new Error('no tiles published yet');
      const value = parseCurrent(JSON.parse(await new Response(object.body).text()));
      cached = { value, readAt: now() };
      return value;
    } catch (error) {
      // A stale pointer still names a file that exists, so keep serving it.
      if (cached) return cached.value;
      throw error;
    }
  };
}

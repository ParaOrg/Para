import type { Index } from './index-schema';
import { STORED_OLD } from './map-file';
import { parseIndex } from './parse-index';

/**
 * The newest older shape that `read` gives and that reads (STORED_OLD, newest first), or null when
 * none does: what the contributor app reads from the public site while the site does not serve
 * this build's shape yet. A file that does not come, or does not read, is passed over.
 */
export async function readOlderIndex(
  read: (url: string) => Promise<unknown>,
  candidates: readonly { url: string; schema: number }[] = STORED_OLD,
): Promise<Index | null> {
  for (const { url, schema } of candidates) {
    try {
      return parseIndex(await read(url), url, schema, 'skip');
    } catch {
      continue;
    }
  }
  return null;
}

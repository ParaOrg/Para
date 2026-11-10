import { footbridgeFileSchema, type Footbridge } from './footbridge-file-schema';

/** Where the footbridge file is served (scripts/landmarks/build.sh writes it to public/data/). */
export const FOOTBRIDGE_FILE_URL = '/data/footbridges.v1.json';

let read: Promise<readonly Footbridge[]> | null = null;

/**
 * The OpenStreetMap footbridges (.scratch/footbridges), read once a page and shared. Loaded with
 * the map's footbridge layer the first time the map reaches street level, never by the page
 * itself. The offline worker keeps the file once read. A failure is not kept, so the next try
 * asks again.
 */
export function fetchFootbridges(): Promise<readonly Footbridge[]> {
  read ??= fetch(FOOTBRIDGE_FILE_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`${FOOTBRIDGE_FILE_URL}: HTTP ${response.status}`);
      return footbridgeFileSchema.parse(await response.json()).footbridges;
    })
    .catch((error: unknown) => {
      read = null;
      throw error;
    });
  return read;
}

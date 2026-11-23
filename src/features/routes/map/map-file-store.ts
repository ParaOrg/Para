import type { MapFileStore } from '../published/fetch-index';
import { MAP_FILE_CACHE } from '../published/map-file';

/**
 * The web pages' store of earlier map files (fetch-index.ts, MapFileStore): the copies the service
 * worker keeps in Cache Storage under MAP_FILE_CACHE. A copy that is missing, not 200 or not JSON
 * reads as none.
 */
export const cacheStorageMapFiles: MapFileStore = async (url) => {
  if (typeof caches === 'undefined') return null;
  const res = await caches.match(url, { cacheName: MAP_FILE_CACHE }).catch(() => undefined);
  if (!res?.ok) return null;
  return res.json().catch(() => null);
};

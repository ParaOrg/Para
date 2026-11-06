import {
  AJAXError,
  addProtocol,
  type AddProtocolAction,
  type RequestParameters,
  type RequestTransformFunction,
} from 'maplibre-gl';

import { BASEMAPS } from '@/features/routes/map/basemap';
import { basemapCacheRules, type BasemapCacheRules } from '@/shared/config/basemap-cache-rules';

import { BASEMAP_COPIES } from './basemap-copies';

/**
 * The contributor app's keeping of the basemap: it has no service worker, so the map's own
 * requests for the basemap host's files go through a protocol of the app's (`transformRequest`
 * and MapLibre's addProtocol, which serves the tile worker's requests too) to Cache Storage, with
 * the public map's offline rules (scripts/node/offline-worker-caches.ts): tiles from the cache
 * first, so a place seen once draws with no signal; the style, TileJSON, sprite and glyphs from
 * the cache at once and refreshed behind it. Everything else goes to the network untouched.
 */
export interface BasemapCache {
  /** For the map's `transformRequest`: the basemap host's files sent through the cache. */
  transformRequest: RequestTransformFunction;
  /** What the protocol answers MapLibre with. */
  load: AddProtocolAction;
}

const PROTOCOL = 'para-basemap';
const PREFIX = `${PROTOCOL}://`;

/** The public map's limits (offline-worker-caches.ts): the tiles' cache the first to go. */
const LIMITS = {
  tiles: { name: 'para-basemap-tiles-v1', maxEntries: 1000 },
  meta: { name: 'para-basemap-meta-v1', maxEntries: 500 },
} as const;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
/** When a copy was kept, on the copy itself: past MAX_AGE_MS a tile is asked of the network. */
const KEPT_AT = 'x-para-kept-at';
/** How many copies are put between two trims of a cache to its limit: a trim lists the cache. */
const TRIM_EVERY = 50;

/**
 * The cache for the basemap at `host`; null where the WebView has no Cache Storage. `styleCopy`
 * answers a design's style that is neither kept nor fetchable (a switch with no signal) with the
 * app's copy of it, null for a URL that is no design's.
 */
export function basemapCache(
  host: string,
  now: () => number = Date.now,
  styleCopy: (url: string) => Promise<unknown> = async () => null,
): BasemapCache | null {
  if (typeof caches === 'undefined') return null;
  const rules = basemapCacheRules(host);
  const putsSinceTrim = { tiles: 0, meta: 0 };

  const keep = async (kind: Kind, url: string, response: Response): Promise<void> => {
    const { name, maxEntries } = LIMITS[kind];
    try {
      const headers = new Headers(response.headers);
      headers.set(KEPT_AT, String(now()));
      const body = await response.arrayBuffer();
      const cache = await caches.open(name);
      await cache.put(url, new Response(body, { status: 200, headers }));
      putsSinceTrim[kind] += 1;
      if (putsSinceTrim[kind] < TRIM_EVERY) return;
      putsSinceTrim[kind] = 0;
      const keys = await cache.keys();
      // Kept in the order they were put: the oldest go first, and none while under the limit.
      const extra = Math.max(0, keys.length - maxEntries);
      await Promise.all(keys.slice(0, extra).map((key) => cache.delete(key)));
    } catch (error) {
      // Full storage, as the public map's caches purge on quota errors: the map still draws.
      console.warn('A basemap file could not be kept for offline use.', error);
    }
  };

  const fromNetwork = async (kind: Kind, url: string, signal: AbortSignal): Promise<Response> => {
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new AJAXError(response.status, response.statusText, url, await response.blob());
    }
    if (response.status === 200) void keep(kind, url, response.clone());
    return response;
  };

  return {
    transformRequest: (url) => (kindOf(rules, url) ? { url: `${PREFIX}${url}` } : undefined),
    load: async (params, abortController) => {
      const url = params.url.slice(PREFIX.length);
      const kind = kindOf(rules, url);
      if (!kind) return { data: await bodyOf(await fetch(url), params) };
      const kept = await (await caches.open(LIMITS[kind].name)).match(url);
      const { signal } = abortController;
      if (kind === 'tiles') {
        if (kept && now() - Number(kept.headers.get(KEPT_AT)) < MAX_AGE_MS) {
          return { data: await bodyOf(kept, params) };
        }
        try {
          return { data: await bodyOf(await fromNetwork(kind, url, signal), params) };
        } catch (error) {
          // Too old to be first, but better than nothing with no signal.
          if (kept && !signal.aborted) return { data: await bodyOf(kept, params) };
          throw error;
        }
      }
      if (!kept) {
        try {
          return { data: await bodyOf(await fromNetwork(kind, url, signal), params) };
        } catch (error) {
          // A design switched to with no signal: drawn from the app's copy of its style, over
          // whatever tiles the phone kept, as the map is made offline (basemap-copies.ts).
          const copy = signal.aborted ? null : await styleCopy(url);
          if (copy !== null) return { data: copy };
          throw error;
        }
      }
      // Refreshed behind the copy, for the next time; with no signal, the copy stays.
      fromNetwork(kind, url, new AbortController().signal).catch(() => undefined);
      return { data: await bodyOf(kept, params) };
    },
  };
}

type Kind = 'tiles' | 'meta';

function kindOf(rules: BasemapCacheRules, url: string): Kind | null {
  if (rules.tiles.test(url)) return 'tiles';
  if (rules.meta.test(url)) return 'meta';
  return null;
}

/** The body as MapLibre asked for it: JSON, text, or the bytes (an image's too). */
async function bodyOf(response: Response, params: RequestParameters): Promise<unknown> {
  if (params.type === 'json') return response.json();
  if (params.type === 'string') return response.text();
  return response.arrayBuffer();
}

let isAdded = false;

/**
 * The app's basemap cache, its protocol added to MapLibre once; null where it cannot be kept.
 * The map takes its `transformRequest` as it is made.
 */
export function keepBasemapOnThePhone(host: string): RequestTransformFunction | undefined {
  const cache = basemapCache(host, Date.now, async (url) => {
    const design = BASEMAPS.find((b) => b.url === url);
    return design ? BASEMAP_COPIES.offline(design) : null;
  });
  if (!cache) return undefined;
  if (!isAdded) {
    addProtocol(PROTOCOL, cache.load);
    isAdded = true;
  }
  return cache.transformRequest;
}

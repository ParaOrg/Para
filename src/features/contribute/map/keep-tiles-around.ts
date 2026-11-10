import type { MapLibreMap, RequestParameters } from 'maplibre-gl';

import type { LngLat } from '@/shared/utils/geo';

import { phoneBasemapCache, type BasemapCache } from './basemap-cache';
import { tilesAround, tileUrl } from './tiles-around';

// Out of the contributor page's opening: fetched once a recording is on (contribute-map.tsx).

/** How many tiles are asked for at once: enough to be quick, few enough not to crowd the ride. */
const WARM_AT_ONCE = 4;

/**
 * Each tile at `urls` put through the cache as the map would ask for it (`load`): one kept fresh
 * is left alone, any other fetched and kept. A tile that fails is skipped, not retried, and a URL
 * that is not the basemap host's is not asked for at all. `urls` are tiles' (a source's template).
 */
export async function warmTiles(cache: BasemapCache, urls: readonly string[]): Promise<void> {
  const asked = urls.flatMap((url) => {
    // The cache's own transform answers at once, never with a promise.
    const request = cache.transformRequest(url) as RequestParameters | undefined;
    return request?.url ? [request.url] : [];
  });
  for (let i = 0; i < asked.length; i += WARM_AT_ONCE) {
    await Promise.all(
      asked
        .slice(i, i + WARM_AT_ONCE)
        .map((url) =>
          Promise.resolve(
            cache.load({ url, type: 'arrayBuffer' } as RequestParameters, new AbortController()),
          ).catch(() => undefined),
        ),
    );
  }
}

/** How far around a ride's start its map is kept: past a short ride, not a whole city. */
export const KEEP_AROUND_M = 6000;
/** The coarsest zoom kept: wider than the city is not needed to find one's way. */
const KEEP_MIN_ZOOM = 10;

/**
 * Keeps the basemap's tiles for KEEP_AROUND_M around `at`, every zoom the style's vector sources
 * have from KEEP_MIN_ZOOM up (closer zooms draw from the last), so the ride's surroundings draw
 * if the signal drops later (Gab, 2026-11-10: a ride begun offline showed no map). Does nothing
 * on the web page, with no signal, or for a style whose sources give no tile template.
 * ponytail: one square at the start; along the route as the ride goes if this proves short.
 */
export async function keepTilesAround(map: MapLibreMap, at: LngLat): Promise<void> {
  const cache = phoneBasemapCache();
  if (!cache || !navigator.onLine) return;
  try {
    await warmTiles(cache, tileUrlsAround(map, at));
  } catch (error) {
    // Storage full or the style unread: the map keeps what it shows, as before.
    console.warn('The map around the ride could not be kept for offline use.', error);
  }
}

/** The tiles of the style's vector sources KEEP_AROUND_M around `at`, from KEEP_MIN_ZOOM up. */
function tileUrlsAround(map: MapLibreMap, at: LngLat): string[] {
  return Object.values(map.getStyle().sources).flatMap((source) => {
    const template = source.type === 'vector' ? source.tiles?.[0] : undefined;
    if (source.type !== 'vector' || !template) return [];
    const maxZoom = source.maxzoom ?? 14;
    return tilesAround(at, KEEP_AROUND_M, Math.min(KEEP_MIN_ZOOM, maxZoom), maxZoom).map((tile) =>
      tileUrl(template, tile),
    );
  });
}

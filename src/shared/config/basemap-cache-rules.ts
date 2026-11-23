// With its extension: Node reads this file without a resolver (scripts/checks/build/context.mjs).
import { OPENFREEMAP_HOST } from './basemap-host.ts';

const escaped = (host: string): string => host.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

export interface BasemapCacheRules {
  /** Style, TileJSON, sprites, glyphs: served from the cache and refreshed behind it. */
  meta: RegExp;
  /** The vector tiles (and OpenFreeMap's raster ones): cache first. */
  tiles: RegExp;
}

/**
 * The basemap's two cache rules for a host, as regular expressions: the public map's offline
 * worker's, and the contributor app's (features/contribute/map/basemap-cache.ts). The worker's: Workbox
 * copies a `urlPattern` function into the worker as text, where a host could not reach
 * it, but a regular expression carries its host in its source. A pattern on another
 * origin must match the whole address from its start, so each begins with the origin.
 * OpenFreeMap keeps its files under /planet and /natural_earth; ours has its tiles at
 * the root and its other files under /styles and /assets (workers/tiles).
 */
export function basemapCacheRules(host: string): BasemapCacheRules {
  const origin = escaped(host);
  if (host === OPENFREEMAP_HOST) {
    return {
      meta: new RegExp(`^${origin}/((styles|sprites|fonts)/|planet(\\?.*)?$)`),
      tiles: new RegExp(`^${origin}/(planet|natural_earth)/.+/\\d+/\\d+/\\d+\\.(pbf|png)(\\?.*)?$`),
    };
  }
  return {
    meta: new RegExp(`^${origin}/(styles|assets)/`),
    tiles: new RegExp(`^${origin}/\\d+/\\d+/\\d+\\.pbf(\\?.*)?$`),
  };
}

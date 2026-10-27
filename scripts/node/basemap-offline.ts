import { OPENFREEMAP_HOST } from '../../src/shared/config/basemap-host.ts';

const escaped = (host: string): string => host.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

export interface BasemapCacheRules {
  /** Style, TileJSON, sprites, glyphs: served from the cache and refreshed behind it. */
  meta: RegExp;
  /** The vector tiles (and OpenFreeMap's raster ones): cache first. */
  tiles: RegExp;
}

/**
 * The offline worker's two basemap rules for a host, as regular expressions: Workbox
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

/**
 * The page's preconnect hint, pointed at the configured host. index.html names
 * OpenFreeMap, the default; the hint is for the host the map will really ask.
 */
export function withBasemapPreconnect(html: string, host: string): string {
  return html.replace(
    /(<link\b[^>]*\brel="preconnect"[^>]*\bhref=")[^"]*(")/,
    (_match, before: string, after: string) => `${before}${host}${after}`,
  );
}

// The cache rules live with the app's code, which the contributor app's own cache reads too.
export {
  basemapCacheRules,
  type BasemapCacheRules,
} from '../../src/shared/config/basemap-cache-rules.ts';

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

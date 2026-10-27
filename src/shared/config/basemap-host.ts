import * as z from 'zod/mini';

/** Where the basemaps come from when no host is configured. */
export const OPENFREEMAP_HOST = 'https://tiles.openfreemap.org';

const hostSchema = z.optional(z.string());

/**
 * The basemap host: an origin with no path, no query and no trailing slash. Unset or
 * empty is OpenFreeMap. A value that is not an http(s) origin throws, so a typo fails
 * the build instead of quietly drawing from somewhere else.
 */
export function parseBasemapHost(value: unknown): string {
  const raw = hostSchema.parse(value)?.trim();
  if (!raw) return OPENFREEMAP_HOST;
  const url = URL.canParse(raw) ? new URL(raw) : null;
  const isOrigin = url !== null && /^https?:$/.test(url.protocol) && url.href === `${url.origin}/`;
  if (!url || !isOrigin) {
    throw new Error(`VITE_BASEMAP_HOST must be an http(s) origin such as ${OPENFREEMAP_HOST}.`);
  }
  return url.origin;
}

/** One design's style address: both OpenFreeMap and our tiles server serve `/styles/<name>`. */
export function basemapStyleUrl(host: string, name: string): string {
  return `${host}/styles/${name}`;
}

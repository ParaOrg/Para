import type { StyleSpecification } from 'maplibre-gl';

import { OPENFREEMAP_HOST, basemapStyleUrl } from '@/shared/config/basemap-host';

/**
 * Where a design is read from once its style failed to load from the configured basemap `host`:
 * OpenFreeMap's style of the same name, which brings its own tiles, sprite and glyphs (ADR 0007:
 * both servers answer `/styles/<name>`). Null when `failedUrl` is not a style of `host`, or the
 * host is OpenFreeMap already and there is nowhere else to go. Pure: no MapLibre.
 */
export function fallbackStyleUrl(host: string, failedUrl: string): string | null {
  if (host === OPENFREEMAP_HOST) return null;
  const styles = `${host}/styles/`;
  if (!failedUrl.startsWith(styles)) return null;
  const name = failedUrl.slice(styles.length).split('?')[0];
  if (!/^[\w-]+$/.test(name)) return null;
  return basemapStyleUrl(OPENFREEMAP_HOST, name);
}

type Style = StyleSpecification | string;

/** What the fallback asks of the map: MapView hands its own. */
interface Restyled {
  once(type: 'style.load', listener: () => void): unknown;
  setStyle(style: Style, options: { diff: false }): unknown;
}

interface OpeningFallback {
  /** The configured basemap host. */
  host: string;
  /** The style the map was opened with. */
  styleUrl: string;
  /** The style to draw from an address, made as the opening's was. */
  makeStyle: (url: string) => Promise<Style>;
  /** Whether the map is gone by now. */
  isGone: () => boolean;
}

/**
 * The opening style failing to come from Para's own host: the same design from OpenFreeMap, for
 * this page's life. The answer is asked on a map error before 'load' and says whether it took the
 * error on. It does so once, and only until a style has come: after that an error is a tile's, and
 * if the fallback's own style fails the map says it failed. The style is set whole, since
 * setStyle's transform hook waits on a style that loaded and this one never did.
 */
export function openingFallback(
  map: Restyled,
  { host, styleUrl, makeStyle, isGone }: OpeningFallback,
): (message: string) => boolean {
  let hasStyle = false;
  let hasFallenBack = false;
  map.once('style.load', () => {
    hasStyle = true;
  });
  return (message) => {
    const fallback = hasStyle || hasFallenBack ? null : fallbackStyleUrl(host, styleUrl);
    if (!fallback) return false;
    hasFallenBack = true;
    console.warn('[map] the basemap host failed; reading this design from OpenFreeMap:', message);
    void makeStyle(fallback).then((style) => {
      if (!isGone()) map.setStyle(style, { diff: false });
    });
    return true;
  };
}

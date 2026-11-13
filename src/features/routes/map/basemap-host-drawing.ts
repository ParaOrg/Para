import { useSyncExternalStore } from 'react';

import { OPENFREEMAP_HOST } from '@/shared/config/basemap-host';

/**
 * The host a style is drawn from, read off its glyphs' address: OpenFreeMap when they are
 * OpenFreeMap's, as after the opening's fallback (basemap-failover.ts), and the configured host
 * otherwise, the contributor app's copies on the phone included. Pure: no MapLibre.
 */
export function hostDrawing(glyphs: string | null, configuredHost: string): string {
  return glyphs?.startsWith(`${OPENFREEMAP_HOST}/`) ? OPENFREEMAP_HOST : configuredHost;
}

// The host the page's map draws from, once a map has said; the credits' sheet reads it.
let drawing: string | null = null;
const listeners = new Set<() => void>();

/** The host the page's map draws from now: the configured one until a map says another. */
export function hostDrawingNow(configuredHost: string): string {
  return drawing ?? configuredHost;
}

/** The host to credit in the Map Data Source sheet, which follows the map's. */
export function useHostDrawing(configuredHost: string): string {
  return useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => hostDrawingNow(configuredHost),
    () => configuredHost,
  );
}

/** What following asks of the map: MapView hands its own. */
interface Styled {
  on(type: 'styledata', listener: () => void): unknown;
  getGlyphs(): string | null;
}

/**
 * Keeps the credits to the host that draws the map: `onChange` each time a style arrives from
 * another host than the last, starting from the configured one, and the sheet's rows with it
 * (useHostDrawing). A map made anew starts from the configured host again.
 */
export function followHostDrawing(
  map: Styled,
  configuredHost: string,
  onChange: (host: string) => void,
): void {
  const note = (host: string) => {
    if (host === hostDrawingNow(configuredHost)) return false;
    drawing = host;
    for (const notify of listeners) notify();
    return true;
  };
  note(configuredHost);
  map.on('styledata', () => {
    const host = hostDrawing(map.getGlyphs(), configuredHost);
    if (note(host)) onChange(host);
  });
}

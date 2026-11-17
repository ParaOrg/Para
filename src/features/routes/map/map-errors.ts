/** What watching asks of the map: MapView hands its own. */
interface Erring {
  on(type: 'error', listener: (e: { error?: { message?: string } }) => void): unknown;
}

interface MapErrors {
  /** Whether the map has had its 'load'. */
  isLoaded: () => boolean;
  /** Whether the routes are drawn on it (saved-routes-layers.ts's routesDrawn). */
  areRoutesDrawn: () => boolean;
  /** The opening's fallback (basemap-failover.ts): whether it took the error on. */
  fallBack: (message: string) => boolean;
  /** The map failed: the failure box says so. */
  onFailure: (message: string) => void;
}

/**
 * What an error on the map means. Once the map is up, or its routes are drawn though 'load'
 * still waits, it is a tile, glyph or sprite of the basemap that did not arrive: offline, a place
 * never viewed before. The map is drawn and working, which is not "failed to load", so only the
 * console hears it. Before that the opening may fall back to OpenFreeMap; otherwise the map
 * failed.
 */
export function watchMapErrors(
  map: Erring,
  { isLoaded, areRoutesDrawn, fallBack, onFailure }: MapErrors,
): void {
  map.on('error', (e) => {
    const message = e.error?.message ?? 'unknown map error';
    if (isLoaded() || areRoutesDrawn()) {
      console.warn('[map]', message);
      return;
    }
    if (fallBack(message)) return;
    console.error('[map]', message, e);
    onFailure(message);
  });
}

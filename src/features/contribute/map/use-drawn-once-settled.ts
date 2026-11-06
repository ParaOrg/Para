import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

/** Fetches a drawing's chunk and hands back what draws it: resolving with what takes it off again. */
export type LoadDrawing = () => Promise<(map: MapLibreMap) => Promise<() => void>>;

/**
 * Draws what `load` fetches on `map` once the map has loaded and drawn its first view, so the
 * opening frames are the map's alone, and takes it off when the map goes. A recording never waits
 * for it: if it cannot be fetched or read, the map shows none of it, and `what` is named in a
 * warning. Pass a `load` defined once at module level, not a new one per render.
 */
export function useDrawnOnceSettled(
  map: MapLibreMap | null,
  isMapLoaded: boolean,
  load: LoadDrawing,
  what: string,
): void {
  useEffect(() => {
    if (!map || !isMapLoaded) return;
    let isCancelled = false;
    let remove: (() => void) | null = null;

    const draw = () => {
      load()
        .then((drawOn) => (isCancelled ? null : drawOn(map)))
        .then((undraw) => {
          if (!undraw) return;
          if (isCancelled) undraw();
          else remove = undraw;
        })
        .catch((error: unknown) => {
          console.warn(`${what} could not be shown on the map.`, error);
        });
    };
    map.once('idle', draw);

    return () => {
      isCancelled = true;
      map.off('idle', draw);
      remove?.();
    };
  }, [map, isMapLoaded, load, what]);
}

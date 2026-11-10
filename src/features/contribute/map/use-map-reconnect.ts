import { RasterTileSource, VectorTileSource, type MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';

/**
 * How long a try at the map is left alone before the page coming back into view starts another:
 * the map view's own wait for its 'load' (map-view.tsx, LOAD_TIMEOUT_MS), so a try still under
 * way is never cut short.
 */
const RETRY_AFTER_MS = 12_000;

/**
 * Tries the map again once the phone has a signal back. A map made with no signal never loads
 * by itself: its style never came, and nothing asks for it again. So while it has not loaded,
 * the phone coming back online, or the page coming back into view with a signal, makes it afresh
 * (the returned number is the map view's `key`). A map that loaded offline from what it had
 * asks its basemap's sources again, so the tiles that failed come in.
 */
export function useMapReconnect(map: MapLibreMap | null, isMapLoaded: boolean): number {
  const [attempt, setAttempt] = useState(0);
  // performance.now, not Date.now: the clock a suite or the page may hold still.
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = performance.now();
  }, [attempt]);

  useEffect(() => {
    const handleOnline = () => {
      if (!isMapLoaded) setAttempt((n) => n + 1);
      else if (map) refetchBasemap(map);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' || isMapLoaded || !navigator.onLine) return;
      if (performance.now() - startedAt.current >= RETRY_AFTER_MS) setAttempt((n) => n + 1);
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [map, isMapLoaded]);

  return attempt;
}

/**
 * Each tiled source of the basemap set to the address it already has, which MapLibre takes as
 * new: its TileJSON asked again, and every tile in view, the failed ones too. Ours, GeoJSON, are
 * left alone.
 */
function refetchBasemap(map: MapLibreMap): void {
  for (const [id, spec] of Object.entries(map.getStyle()?.sources ?? {})) {
    const source = map.getSource(id);
    if (!(source instanceof VectorTileSource || source instanceof RasterTileSource)) continue;
    if ('url' in spec && spec.url) source.setUrl(spec.url);
    else if ('tiles' in spec && spec.tiles) source.setTiles(spec.tiles);
  }
}

import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import type { LngLat } from '@/shared/utils/geo';
import { retryingImport } from '@/shared/utils/retrying-import';

// Fetched as a recording starts, not with the page. Pure, so the web build drops it with the hook.
const loadKeepTiles = /* @__PURE__ */ retryingImport(() => import('./keep-tiles-around'));

/**
 * A ride's surroundings kept on the phone once the rider's dot is known with signal, so its map
 * still draws if the signal drops on the way (keep-tiles-around.ts). Once a ride; a ride begun
 * with no signal tries again at the next fix once there is one. The app's alone: the web page has
 * its worker, and contribute-map.tsx leaves this out of its build.
 */
export function useKeepRideTiles(
  map: MapLibreMap | null,
  isMapLoaded: boolean,
  isRecording: boolean,
  at: LngLat | undefined,
) {
  const keptForRide = useRef(false);
  useEffect(() => {
    if (!isRecording) {
      keptForRide.current = false;
      return;
    }
    if (keptForRide.current || !map || !isMapLoaded || !at || !navigator.onLine) return;
    keptForRide.current = true;
    // keepTilesAround says its own failures; its chunk not coming (the signal just went) is no news.
    loadKeepTiles().then(
      ({ keepTilesAround }) => keepTilesAround(map, at),
      () => undefined,
    );
  }, [isRecording, map, isMapLoaded, at]);
}

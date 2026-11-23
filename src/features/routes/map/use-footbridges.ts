import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { retryingImport } from '@/shared/utils/retrying-import';

import { FOOTBRIDGE_LAYERS, FOOTBRIDGE_MIN_ZOOM } from './footbridge-zoom';

// The layer and the file's reader: not in the code every page opens with (vite.config.ts).
const loadFootbridgeLayer = retryingImport(() => import('./footbridge-layer'));

/**
 * The footbridges on `map` (.scratch/footbridges), fetched the first time the map is at
 * FOOTBRIDGE_MIN_ZOOM or closer while `isShown`, never before: a commuter who never zooms in, or
 * an editor who leaves the studio's switch off, never downloads them. A failed read (offline
 * before the file was kept) is tried again at the next zoom in. Turned off once drawn, the
 * layers are hidden, not removed, so turning them on again fetches nothing.
 */
export function useFootbridges(map: MapLibreMap | null, isShown = true): void {
  useEffect(() => {
    if (!map) return;
    for (const layer of [FOOTBRIDGE_LAYERS.line, FOOTBRIDGE_LAYERS.elevator]) {
      if (map.getLayer(layer)) {
        map.setLayoutProperty(layer, 'visibility', isShown ? 'visible' : 'none');
      }
    }
    if (!isShown || map.getSource(FOOTBRIDGE_LAYERS.source)) return;
    let isGone = false;
    let isAsking = false;
    const handleZoom = () => {
      if (isAsking || map.getZoom() < FOOTBRIDGE_MIN_ZOOM) return;
      isAsking = true;
      loadFootbridgeLayer()
        .then(({ showFootbridges }) => showFootbridges(map, () => !isGone))
        .then(() => map.off('zoomend', handleZoom))
        .catch((error: unknown) => {
          console.warn('The footbridges could not be loaded; the map goes on without them.', error);
          isAsking = false;
        });
    };
    map.on('zoomend', handleZoom);
    handleZoom();
    return () => {
      isGone = true;
      map.off('zoomend', handleZoom);
    };
  }, [map, isShown]);
}

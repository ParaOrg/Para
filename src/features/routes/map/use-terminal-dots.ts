import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { retryingImport } from '@/shared/utils/retrying-import';

import { TERMINAL_DOTS, TERMINAL_DOTS_MIN_ZOOM, TERMINAL_SOURCE } from './terminal-points';

// The layer and the file's reader: not in the code the studio opens with.
const loadTerminalDots = retryingImport(() => import('./terminal-dots-layer'));

/**
 * The map's place for the dots, claimed before they are read: their source, empty, and the
 * commuter's terminal markers taken away if already drawn. The markers' layer is not drawn on a
 * map with this source (terminal-markers.ts), so the studio never draws them only to take them
 * away again at street zoom, under a camera move or a test waiting for the map to rest.
 */
function claimTerminalDots(map: MapLibreMap): void {
  if (!map.getSource(TERMINAL_DOTS.source)) {
    map.addSource(TERMINAL_DOTS.source, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    });
  }
  if (map.getLayer(TERMINAL_SOURCE)) map.removeLayer(TERMINAL_SOURCE);
  if (map.getSource(TERMINAL_SOURCE)) map.removeSource(TERMINAL_SOURCE);
}

/**
 * The studio's possible terminals on `map` (.scratch/terminals): their place claimed at once
 * (claimTerminalDots), then the file fetched the first time the map is at TERMINAL_DOTS_MIN_ZOOM
 * or closer, never before. A failed read (offline before the file was kept) is tried again at the
 * next zoom in. Once drawn they stay, as the hintuans do.
 */
export function useTerminalDots(map: MapLibreMap | null): void {
  useEffect(() => {
    if (!map || map.getLayer(TERMINAL_DOTS.dot)) return;
    // A style still loading takes no source: claimed at its first styledata after.
    const handleStyle = () => {
      if (!map.isStyleLoaded()) return;
      claimTerminalDots(map);
      map.off('styledata', handleStyle);
    };
    map.on('styledata', handleStyle);
    handleStyle();
    let isGone = false;
    let isAsking = false;
    const handleZoom = () => {
      if (isAsking || map.getZoom() < TERMINAL_DOTS_MIN_ZOOM) return;
      isAsking = true;
      loadTerminalDots()
        .then(({ showTerminalDots }) => showTerminalDots(map, () => !isGone))
        .then(() => map.off('zoomend', handleZoom))
        .catch((error: unknown) => {
          console.warn(
            'The possible terminals could not be loaded; the map goes on without them.',
            error,
          );
          isAsking = false;
        });
    };
    map.on('zoomend', handleZoom);
    handleZoom();
    return () => {
      isGone = true;
      map.off('styledata', handleStyle);
      map.off('zoomend', handleZoom);
    };
  }, [map]);
}

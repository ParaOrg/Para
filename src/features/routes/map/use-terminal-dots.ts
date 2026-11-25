import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { retryingImport } from '@/shared/utils/retrying-import';

import { TERMINAL_DOTS, TERMINAL_DOTS_MIN_ZOOM } from './terminal-points';

// The layer and the file's reader: not in the code the studio opens with.
const loadTerminalDots = retryingImport(() => import('./terminal-dots-layer'));

/**
 * The studio's possible terminals on `map` (.scratch/terminals), fetched the first time the map
 * is at TERMINAL_DOTS_MIN_ZOOM or closer, never before. A failed read (offline before the file
 * was kept) is tried again at the next zoom in. Once drawn they stay, as the hintuans do.
 */
export function useTerminalDots(map: MapLibreMap | null): void {
  useEffect(() => {
    if (!map || map.getSource(TERMINAL_DOTS.source)) return;
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
      map.off('zoomend', handleZoom);
    };
  }, [map]);
}

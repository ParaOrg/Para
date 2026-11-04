import type { MapLibreMap } from 'maplibre-gl';

import { retryingImport } from '@/shared/utils/retrying-import';

import { useDrawnOnceSettled, type LoadDrawing } from './use-drawn-once-settled';

// Not on the page's opening path: fetched once the map has drawn its first view.
const loadPublishedHotspots = retryingImport(() => import('./published-hotspots'));
const loadDrawing: LoadDrawing = () =>
  loadPublishedHotspots().then(({ drawPublishedHotspots }) => drawPublishedHotspots);

/**
 * The published hotspots on the contributor's map, display-only (nothing listens for a tap on
 * them), once the map has loaded and settled.
 */
export function usePublishedHotspots(map: MapLibreMap | null, isMapLoaded: boolean): void {
  useDrawnOnceSettled(map, isMapLoaded, loadDrawing, 'The published hotspots');
}

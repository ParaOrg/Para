import type { MapLibreMap } from 'maplibre-gl';

import { retryingImport } from '@/shared/utils/retrying-import';

import { useDrawnOnceSettled, type LoadDrawing } from './use-drawn-once-settled';

// Not on the page's opening path: fetched once the map has drawn its first view.
const loadPublishedRoutes = retryingImport(() => import('./published-routes'));
const loadDrawing: LoadDrawing = () =>
  loadPublishedRoutes().then(({ drawPublishedRoutes }) => drawPublishedRoutes);

/** The published routes on the contributor's map, once the map has loaded and settled. */
export function usePublishedRoutes(map: MapLibreMap | null, isMapLoaded: boolean): void {
  useDrawnOnceSettled(map, isMapLoaded, loadDrawing, 'The published routes');
}

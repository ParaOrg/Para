import type { MapLibreMap } from 'maplibre-gl';

import type { LngLat } from '@/shared/utils/geo';

import { APP_MOVE } from './map-view';

/** How close a look at a point comes, as a box shown does (useSavedHotspots' show). */
const LOOK_ZOOM = 16;

/**
 * The camera to a point that is not a hotspot: a place search landmark (.scratch/place-search,
 * step 2). As close as a box shown, never farther out than the commuter already was.
 */
export function useLookAt(map: MapLibreMap | null): (point: LngLat) => void {
  return (point) => {
    map?.flyTo({ center: point, zoom: Math.max(map.getZoom(), LOOK_ZOOM) }, APP_MOVE);
  };
}

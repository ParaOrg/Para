import type { MapLibreMap } from 'maplibre-gl';

import { BASEMAPS } from '@/features/routes/map/basemap';
import { BASEMAP_THUMBNAILS } from '@/features/routes/map/basemap-thumbnails';
import { MapViewPill } from '@/features/routes/map/map-view-pill';

interface MapViewCornerProps {
  map: MapLibreMap | null;
  isMapLoaded: boolean;
}

/**
 * Where the public map's MapViewPill stands (4885:44805): at the top right on a phone, 24 down and
 * 16 in, under the open card's sheet, which slides over it. Where the card floats (`@float:`,
 * 4886:47571), at the bottom right, 12 over the LocatorButton: its 48 and the 16 under it.
 */
export function MapViewCorner({ map, isMapLoaded }: MapViewCornerProps) {
  return (
    <div className="pointer-events-auto absolute top-[calc(var(--map-safe-top,env(safe-area-inset-top))+1.5rem)] right-[calc(1rem+env(safe-area-inset-right))] z-[5] @float:top-auto @float:bottom-[calc(4.75rem+env(safe-area-inset-bottom))]">
      <MapViewPill
        map={map}
        isMapLoaded={isMapLoaded}
        basemaps={BASEMAPS}
        thumbnails={BASEMAP_THUMBNAILS}
        labelsPlace="map"
      />
    </div>
  );
}

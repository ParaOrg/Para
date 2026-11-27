import type { MapLibreMap } from 'maplibre-gl';

import { useMapMarker, useMarkerElement } from '@/features/routes/map/use-map-marker';
import type { LngLat } from '@/shared/utils/geo';

interface EndMarkProps {
  map: MapLibreMap;
  at: LngLat;
}

/** A ring on the map where an old Para route with no line ends, to draw to. A placeholder look. */
export function EndMark({ map, at }: EndMarkProps) {
  const el = useMarkerElement(
    'old-para-end',
    'pointer-events-none size-5 rounded-full bg-surface shadow-large ring-4 ring-content-primary',
  );
  useMapMarker(map, el, at, { anchor: 'center' });
  return null;
}

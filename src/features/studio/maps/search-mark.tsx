import type { MapLibreMap } from 'maplibre-gl';

import { useMapMarker, useMarkerElement } from '@/features/routes/map/use-map-marker';
import type { LngLat } from '@/shared/utils/geo';

interface SearchMarkProps {
  map: MapLibreMap;
  /** The point a search took the camera to: a landmark, or a hotspot found while drawing. */
  at: LngLat;
}

/**
 * A small dot where a studio search took the camera (ticket 05, decision 45), so the editor sees
 * what was found. It marks nothing and catches no tap; StudioSearch takes it away after a while.
 * A look for now, from the tokens; the owner designs it.
 */
export function SearchMark({ map, at }: SearchMarkProps) {
  const el = useMarkerElement(
    'search-mark',
    'pointer-events-none size-4 rounded-full bg-brand-surface shadow-large ring-2 ring-surface',
  );
  useMapMarker(map, el, at, { anchor: 'center' });
  return null;
}

import type { MapLibreMap } from 'maplibre-gl';

import { useMapMarker, useMarkerElement } from '@/features/routes/map/use-map-marker';
import type { LngLat } from '@/shared/utils/geo';

import type { CheckSpot } from './check-spots';

interface CheckSpotMarksProps {
  map: MapLibreMap;
  spots: CheckSpot[];
}

/** A dot on the map at each place to check in a drawing from an OSM route. A placeholder look. */
export function CheckSpotMarks({ map, spots }: CheckSpotMarksProps) {
  return spots.map((spot) => (
    <CheckSpotMark key={`${spot.kind}-${spot.at.join(',')}`} map={map} at={spot.at} />
  ));
}

function CheckSpotMark({ map, at }: { map: MapLibreMap; at: LngLat }) {
  const el = useMarkerElement(
    'osm-check-spot',
    'pointer-events-none size-4 rounded-full bg-error-surface shadow-large ring-2 ring-surface',
  );
  useMapMarker(map, el, at, { anchor: 'center' });
  return null;
}

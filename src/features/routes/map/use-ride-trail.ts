import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { addRideTrail, setRideTrail, type RideTrail } from './ride-trail';

/**
 * A contributor's recording drawn on `map` as it is made: blue for papunta and
 * orange for pabalik, a dot at each switch, and the contributor's own dot.
 */
export function useRideTrail(map: MapLibreMap | null, trail: RideTrail): void {
  useEffect(() => {
    if (map) addRideTrail(map);
  }, [map]);

  useEffect(() => {
    if (map) setRideTrail(map, trail);
  }, [map, trail]);
}

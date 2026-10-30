import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { addRecordingTrail, setRecordingTrail, type RecordingTrail } from './recording-trail';

/**
 * A contributor's recording drawn on `map` as it is made: a line per walked or
 * ridden run, a dot at each switch, and a pin at each mark.
 */
export function useRecordingTrail(map: MapLibreMap | null, trail: RecordingTrail): void {
  useEffect(() => {
    if (map) addRecordingTrail(map);
  }, [map]);

  useEffect(() => {
    if (map) setRecordingTrail(map, trail);
  }, [map, trail]);
}

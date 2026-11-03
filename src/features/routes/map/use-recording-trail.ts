import type { MapLibreMap, MapStyleImageMissingEvent } from 'maplibre-gl';
import { useEffect } from 'react';

import { addRecordingTrail, setRecordingTrail, type RecordingTrail } from './recording-trail';
import { FLAG_IMAGE, addFlagImage } from './trail-flag';
import { FOOT_IMAGE, addFootImage } from './trail-foot';

/**
 * A contributor's recording drawn on `map` as it is made: walked runs dashed
 * with a foot along them, ridden runs solid, a dot at each switch, and the
 * flagstop pin at each flagged stop.
 */
export function useRecordingTrail(map: MapLibreMap | null, trail: RecordingTrail): void {
  useEffect(() => {
    if (!map) return;
    addRecordingTrail(map);
    // A basemap switch brings a new style without the foot and the flag; the map asks again.
    const handleImageMissing = (event: MapStyleImageMissingEvent) => {
      if (event.id === FOOT_IMAGE) addFootImage(map);
      if (event.id === FLAG_IMAGE) addFlagImage(map);
    };
    map.on('styleimagemissing', handleImageMissing);
    return () => {
      map.off('styleimagemissing', handleImageMissing);
    };
  }, [map]);

  useEffect(() => {
    if (map) setRecordingTrail(map, trail);
  }, [map, trail]);
}

import type { MapLibreMap } from 'maplibre-gl';
import { useState } from 'react';

import { MapView } from '@/features/routes/map/map-view';
import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { useRecordingTrail } from '@/features/routes/map/use-recording-trail';
import type { LngLat } from '@/shared/utils/geo';

import { BASEMAP_REQUESTS, MAKE_STYLE } from '../map/basemap-options';

/** How close the map stands over a stop: its street and the stretch of trail either side. */
export const STOP_MAP_ZOOM = 16;

const NO_TRAIL: RecordingTrail = { lines: [], markers: [], marks: [] };

interface StopMapProps {
  /** The ride's trail with its flags, as the page's map draws it; null when there is none. */
  trail: RecordingTrail | null;
  /** The stop to stand over; null for a ride with no position for it, which opens on the region. */
  at: LngLat | null;
}

/**
 * A flagged stop on its own small map (4725:29152): the ride's trail and flags, centred on the
 * stop, and only dragged. No zoom and no turn: it shows where the stop is, it is not a second map
 * to work in. Its MapView makes the instance and takes it down as the pop-up closes.
 */
export function StopMap({ trail, at }: StopMapProps) {
  const [map, setMap] = useState<MapLibreMap | null>(null);
  useRecordingTrail(map, trail ?? NO_TRAIL);

  const handleReady = (made: MapLibreMap) => {
    for (const gesture of [
      made.scrollZoom,
      made.boxZoom,
      made.doubleClickZoom,
      made.touchZoomRotate,
      made.dragRotate,
      made.keyboard,
    ]) {
      gesture.disable();
    }
    if (at) made.jumpTo({ center: [...at], zoom: STOP_MAP_ZOOM });
    setMap(made);
  };

  return (
    <MapView
      onReady={handleReady}
      isExposed={false}
      zoomButtons={false}
      hasMapStyleButton={false}
      creditsAtBottom
      makeStyle={MAKE_STYLE}
      transformRequest={BASEMAP_REQUESTS}
    />
  );
}

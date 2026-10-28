import type { FilterSpecification, GeoJSONSource, MapLibreMap } from 'maplibre-gl';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';
import type { LngLat } from '@/shared/utils/geo';

import { CASING_EXTRA, litRadius, litWidth } from './line-style';
import type { Way } from '../model/ride-recording';

/** A run of the trail on one way: outbound is papunta, return is pabalik. */
export interface TrailLine {
  way: Way;
  path: readonly LngLat[];
}

/** A dot where the way switched, ringed in the colour of the way that began there. */
export interface TrailMarker {
  at: LngLat;
  way: Way;
}

/** A pin where the contributor marked the place they were. */
export interface TrailMark {
  at: LngLat;
}

/** What the contributor's recording has drawn so far. */
export interface RecordingTrail {
  lines: readonly TrailLine[];
  markers: readonly TrailMarker[];
  marks: readonly TrailMark[];
}

export const TRAIL_SRC = 'recording-trail';
const CASING = 'recording-trail-casing';
const LINE = 'recording-trail-line';
const MARKERS = 'recording-trail-markers';
const MARKS = 'recording-trail-marks';

/** The trail as its source takes it: a line per run, a point per switch, and a point per mark. */
export function trailData(trail: RecordingTrail) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...trail.lines
        .filter((line) => line.path.length >= 2)
        .map((line) => ({
          type: 'Feature' as const,
          properties: { way: line.way },
          geometry: { type: 'LineString' as const, coordinates: line.path.map((p) => [...p]) },
        })),
      ...trail.markers.map((marker) => ({
        type: 'Feature' as const,
        properties: { kind: 'switch', way: marker.way },
        geometry: { type: 'Point' as const, coordinates: [...marker.at] },
      })),
      ...trail.marks.map((mark) => ({
        type: 'Feature' as const,
        properties: { kind: 'mark' },
        geometry: { type: 'Point' as const, coordinates: [...mark.at] },
      })),
    ],
  };
}

/** Adds the trail's source and layers, empty. A basemap switch carries them across (basemap.ts). */
export function addRecordingTrail(map: MapLibreMap): void {
  if (map.getSource(TRAIL_SRC)) return;
  map.addSource(TRAIL_SRC, {
    type: 'geojson',
    data: trailData({ lines: [], markers: [], marks: [] }),
  });
  const isLine: FilterSpecification = ['==', ['geometry-type'], 'LineString'];
  map.addLayer({
    id: CASING,
    type: 'line',
    source: TRAIL_SRC,
    filter: isLine,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': MAP_PAINT['Paint/casing'], 'line-width': litWidth(CASING_EXTRA) },
  });
  map.addLayer({
    id: LINE,
    type: 'line',
    source: TRAIL_SRC,
    filter: isLine,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': [
        'match',
        ['get', 'way'],
        'return',
        MAP_COLOURS['Map/Trail/pabalik'],
        MAP_COLOURS['Map/Trail/papunta'],
      ],
      'line-width': litWidth(),
    },
  });
  map.addLayer({
    id: MARKERS,
    type: 'circle',
    source: TRAIL_SRC,
    filter: ['==', ['get', 'kind'], 'switch'],
    paint: {
      'circle-radius': litRadius(CASING_EXTRA),
      'circle-color': MAP_PAINT['Paint/casing'],
      'circle-stroke-color': [
        'match',
        ['get', 'way'],
        'return',
        MAP_COLOURS['Map/Trail/pabalik'],
        MAP_COLOURS['Map/Trail/papunta'],
      ],
      'circle-stroke-width': 3,
    },
  });
  map.addLayer({
    id: MARKS,
    type: 'circle',
    source: TRAIL_SRC,
    filter: ['==', ['get', 'kind'], 'mark'],
    paint: {
      'circle-radius': litRadius(CASING_EXTRA),
      'circle-color': MAP_COLOURS['Map/Trail/mark'],
      'circle-stroke-color': MAP_PAINT['Paint/casing'],
      'circle-stroke-width': 2,
    },
  });
}

/** Lays the trail out in its source. */
export function setRecordingTrail(map: MapLibreMap, trail: RecordingTrail): void {
  map.getSource<GeoJSONSource>(TRAIL_SRC)?.setData(trailData(trail));
}

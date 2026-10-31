import type { FilterSpecification, GeoJSONSource, MapLibreMap } from 'maplibre-gl';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';
import type { LngLat } from '@/shared/utils/geo';

import { CASING_EXTRA, litRadius, litWidth } from './line-style';
import { FLAG_IMAGE, FLAG_POINT_X, addFlagImage } from './trail-flag';
import { FOOT_IMAGE, addFootImage } from './trail-foot';
import type { Mode } from '../model/ride-recording';

/** A run of the trail on one mode: walk is Lakad, ride is Sakay. */
export interface TrailLine {
  mode: Mode;
  path: readonly LngLat[];
}

/** A dot where the mode switched. */
export interface TrailMarker {
  at: LngLat;
  mode: Mode;
}

/** A flagged stop: a pin where the contributor marked the place they were. */
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
const RIDE = 'recording-trail-line';
const WALK = 'recording-trail-walk';
const FEET = 'recording-trail-feet';
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
          properties: { mode: line.mode },
          geometry: { type: 'LineString' as const, coordinates: line.path.map((p) => [...p]) },
        })),
      ...trail.markers.map((marker) => ({
        type: 'Feature' as const,
        properties: { kind: 'switch', mode: marker.mode },
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
  addFootImage(map);
  addFlagImage(map);
  map.addSource(TRAIL_SRC, {
    type: 'geojson',
    data: trailData({ lines: [], markers: [], marks: [] }),
  });
  const isLine: FilterSpecification = ['==', ['geometry-type'], 'LineString'];
  const isWalk: FilterSpecification = ['all', isLine, ['==', ['get', 'mode'], 'walk']];
  const isRide: FilterSpecification = ['all', isLine, ['==', ['get', 'mode'], 'ride']];
  map.addLayer({
    id: CASING,
    type: 'line',
    source: TRAIL_SRC,
    filter: isLine,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': MAP_PAINT['Paint/casing'], 'line-width': litWidth(CASING_EXTRA) },
  });
  map.addLayer({
    id: RIDE,
    type: 'line',
    source: TRAIL_SRC,
    filter: isRide,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': MAP_COLOURS['Map/Trail/line'], 'line-width': litWidth() },
  });
  // Walking is dashed: a dash and a gap each about the line's own width, measured in line widths.
  map.addLayer({
    id: WALK,
    type: 'line',
    source: TRAIL_SRC,
    filter: isWalk,
    layout: { 'line-cap': 'butt', 'line-join': 'round' },
    paint: {
      'line-color': MAP_COLOURS['Map/Trail/line'],
      'line-width': litWidth(),
      'line-dasharray': [1.2, 1],
    },
  });
  // A foot every so often along a walked line, its toes turned the way the line runs.
  map.addLayer({
    id: FEET,
    type: 'symbol',
    source: TRAIL_SRC,
    filter: isWalk,
    layout: {
      'symbol-placement': 'line',
      'symbol-spacing': 80,
      'icon-image': FOOT_IMAGE,
      'icon-rotate': 90,
      'icon-rotation-alignment': 'map',
      'icon-keep-upright': false,
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
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
      'circle-stroke-color': MAP_COLOURS['Map/Trail/line'],
      'circle-stroke-width': 3,
    },
  });
  // Figma's flagstop pin, its point (the stem's foot) on the place: always drawn, over the rest.
  map.addLayer({
    id: MARKS,
    type: 'symbol',
    source: TRAIL_SRC,
    filter: ['==', ['get', 'kind'], 'mark'],
    layout: {
      'icon-image': FLAG_IMAGE,
      'icon-anchor': 'bottom-left',
      'icon-offset': [-FLAG_POINT_X, 0],
      'icon-allow-overlap': true,
      'icon-ignore-placement': true,
    },
  });
}

/** Lays the trail out in its source. */
export function setRecordingTrail(map: MapLibreMap, trail: RecordingTrail): void {
  map.getSource<GeoJSONSource>(TRAIL_SRC)?.setData(trailData(trail));
}

import type { FilterSpecification, GeoJSONSource, MapLibreMap } from 'maplibre-gl';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';
import type { LngLat } from '@/shared/utils/geo';

/** Which leg of the loop a stretch of the trail is: papunta out, pabalik back. */
export type TrailDirection = 'papunta' | 'pabalik';

export interface TrailLeg {
  direction: TrailDirection;
  path: readonly LngLat[];
}

/** What the contributor's recording has drawn so far. */
export interface RideTrail {
  legs: readonly TrailLeg[];
  /** A dot at each switch of leg. */
  markers: readonly LngLat[];
  /** Where the contributor is now, or null before the first fix. */
  here: LngLat | null;
}

export const TRAIL_SRC = 'ride-trail';
const CASING = 'ride-trail-casing';
const LINE = 'ride-trail-line';
const MARKERS = 'ride-trail-markers';
const HERE = 'ride-trail-here';

/** The trail as its source takes it: a line per leg, a point per switch, and the contributor. */
export function trailData(trail: RideTrail) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...trail.legs
        .filter((leg) => leg.path.length >= 2)
        .map((leg) => ({
          type: 'Feature' as const,
          properties: { direction: leg.direction },
          geometry: { type: 'LineString' as const, coordinates: leg.path.map((p) => [...p]) },
        })),
      ...trail.markers.map((at) => ({
        type: 'Feature' as const,
        properties: { kind: 'switch' },
        geometry: { type: 'Point' as const, coordinates: [...at] },
      })),
      ...(trail.here
        ? [
            {
              type: 'Feature' as const,
              properties: { kind: 'here' },
              geometry: { type: 'Point' as const, coordinates: [...trail.here] },
            },
          ]
        : []),
    ],
  };
}

/** Adds the trail's source and layers, empty. A basemap switch carries them across (basemap.ts). */
export function addRideTrail(map: MapLibreMap): void {
  if (map.getSource(TRAIL_SRC)) return;
  map.addSource(TRAIL_SRC, {
    type: 'geojson',
    data: trailData({ legs: [], markers: [], here: null }),
  });
  const isLine: FilterSpecification = ['==', ['geometry-type'], 'LineString'];
  map.addLayer({
    id: CASING,
    type: 'line',
    source: TRAIL_SRC,
    filter: isLine,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': MAP_PAINT['Paint/casing'], 'line-width': 9 },
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
        ['get', 'direction'],
        'pabalik',
        MAP_COLOURS['Map/Trail/pabalik'],
        MAP_COLOURS['Map/Trail/papunta'],
      ],
      'line-width': 5,
    },
  });
  map.addLayer({
    id: MARKERS,
    type: 'circle',
    source: TRAIL_SRC,
    filter: ['==', ['get', 'kind'], 'switch'],
    paint: {
      'circle-radius': 6,
      'circle-color': MAP_PAINT['Paint/casing'],
      'circle-stroke-color': MAP_COLOURS['Map/Trail/pabalik'],
      'circle-stroke-width': 3,
    },
  });
  map.addLayer({
    id: HERE,
    type: 'circle',
    source: TRAIL_SRC,
    filter: ['==', ['get', 'kind'], 'here'],
    paint: {
      'circle-radius': 8,
      'circle-color': MAP_COLOURS['Map/LocatorIndicatorOverlay/border'],
      'circle-stroke-color': MAP_PAINT['Paint/casing'],
      'circle-stroke-width': 3,
    },
  });
}

/** Lays the trail out in its source. */
export function setRideTrail(map: MapLibreMap, trail: RideTrail): void {
  const source = map.getSource(TRAIL_SRC);
  if (source) (source as GeoJSONSource).setData(trailData(trail));
}

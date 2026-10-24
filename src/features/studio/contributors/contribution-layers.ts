import type { GeoJSONSource, MapLibreMap } from 'maplibre-gl';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';
import type { LngLat } from '@/shared/utils/geo';

import { placeMark } from './mark-placement';
import type { Contribution, ContributionDetail } from '../data/contributions-read';

export const UPLOADS_SRC = 'studio-contributions';
export const OPENED_SRC = 'studio-contribution-opened';
/** The faint uploads, the one tappable layer. */
export const UPLOADS_LINE = 'studio-contributions-line';
const UPLOADS_DOT = 'studio-contributions-dot';
const OPENED_CASING = 'studio-contribution-casing';
const OPENED_LINE = 'studio-contribution-line';
const OPENED_HINTOS = 'studio-contribution-hintos';
const OPENED_MARKS = 'studio-contribution-marks';
const LAYERS = [OPENED_MARKS, OPENED_HINTOS, OPENED_LINE, OPENED_CASING, UPLOADS_DOT, UPLOADS_LINE];

const centreOf = ([west, south, east, north]: readonly [
  number,
  number,
  number,
  number,
]): LngLat => [(west + east) / 2, (south + north) / 2];

/** Each upload as one feature: its line, or a dot at its box's centre when it has no line. */
export function uploadsData(contributions: readonly Contribution[]) {
  const hasLine = (c: Contribution) => c.line !== null && c.line.length >= 2;
  const lines = contributions.filter(hasLine).map((c) => ({
    type: 'Feature' as const,
    properties: { id: c.id, hidden: c.hiddenAt !== null },
    geometry: { type: 'LineString' as const, coordinates: (c.line ?? []).map((p) => [...p]) },
  }));
  const dots = contributions
    .filter((c) => !hasLine(c))
    .flatMap((c) => (c.box ? [{ id: c.id, at: centreOf(c.box), hidden: c.hiddenAt !== null }] : []))
    .map(({ id, at, hidden }) => ({
      type: 'Feature' as const,
      properties: { id, hidden },
      geometry: { type: 'Point' as const, coordinates: [...at] },
    }));
  return { type: 'FeatureCollection' as const, features: [...lines, ...dots] };
}

/** The opened upload: every point the phone sent, a circle per hinto sized by its minutes, and a pin per mark. */
export function openedData(detail: ContributionDetail | null) {
  if (!detail) return { type: 'FeatureCollection' as const, features: [] };
  const trail = detail.trail.map((p) => [...p.at]);
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...(trail.length >= 2
        ? [
            {
              type: 'Feature' as const,
              properties: { kind: 'trail' },
              geometry: { type: 'LineString' as const, coordinates: trail },
            },
          ]
        : []),
      ...detail.hintos.map((h) => ({
        type: 'Feature' as const,
        properties: { kind: 'hinto', minutes: Math.round(h.seconds / 60) },
        geometry: { type: 'Point' as const, coordinates: [...h.at] },
      })),
      ...detail.marks.flatMap((time) => {
        const at = placeMark(detail.trail, time);
        return at
          ? [
              {
                type: 'Feature' as const,
                properties: { kind: 'mark', time },
                geometry: { type: 'Point' as const, coordinates: [...at] },
              },
            ]
          : [];
      }),
    ],
  };
}

/** Adds the uploads' sources and layers, empty. A basemap switch carries them across (basemap.ts). */
export function addContributionLayers(map: MapLibreMap): void {
  if (map.getSource(UPLOADS_SRC)) return;
  map.addSource(UPLOADS_SRC, { type: 'geojson', data: uploadsData([]), promoteId: 'id' });
  map.addSource(OPENED_SRC, { type: 'geojson', data: openedData(null) });
  const opened = MAP_COLOURS['Map/Trail/pabalik'];
  map.addLayer({
    id: UPLOADS_LINE,
    type: 'line',
    source: UPLOADS_SRC,
    filter: ['==', ['geometry-type'], 'LineString'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: {
      'line-color': [
        'case',
        ['boolean', ['feature-state', 'opened'], false],
        opened,
        MAP_COLOURS['Map/Trail/papunta'],
      ],
      'line-opacity': [
        'case',
        ['boolean', ['feature-state', 'opened'], false],
        0.9,
        ['get', 'hidden'],
        0.2,
        0.45,
      ],
      'line-width': 4,
    },
  });
  map.addLayer({
    id: UPLOADS_DOT,
    type: 'circle',
    source: UPLOADS_SRC,
    filter: ['==', ['geometry-type'], 'Point'],
    paint: {
      'circle-radius': 6,
      'circle-color': MAP_COLOURS['Map/Trail/papunta'],
      'circle-stroke-color': MAP_PAINT['Paint/casing'],
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: OPENED_CASING,
    type: 'line',
    source: OPENED_SRC,
    filter: ['==', ['get', 'kind'], 'trail'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': MAP_PAINT['Paint/casing'], 'line-width': 8 },
  });
  map.addLayer({
    id: OPENED_LINE,
    type: 'line',
    source: OPENED_SRC,
    filter: ['==', ['get', 'kind'], 'trail'],
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': opened, 'line-width': 4 },
  });
  map.addLayer({
    id: OPENED_HINTOS,
    type: 'circle',
    source: OPENED_SRC,
    filter: ['==', ['get', 'kind'], 'hinto'],
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['get', 'minutes'], 0, 5, 10, 14],
      'circle-color': MAP_COLOURS['Map/RouteLine/Hintuan/surface-default'],
      'circle-opacity': 0.7,
      'circle-stroke-color': MAP_PAINT['Paint/casing'],
      'circle-stroke-width': 2,
    },
  });
  map.addLayer({
    id: OPENED_MARKS,
    type: 'circle',
    source: OPENED_SRC,
    filter: ['==', ['get', 'kind'], 'mark'],
    paint: {
      'circle-radius': 7,
      'circle-color': MAP_PAINT['Paint/casing'],
      'circle-stroke-color': opened,
      'circle-stroke-width': 3,
    },
  });
}

/** Takes the uploads off the map again, when the Contributors map closes. */
export function removeContributionLayers(map: MapLibreMap): void {
  for (const id of LAYERS) if (map.getLayer(id)) map.removeLayer(id);
  for (const id of [UPLOADS_SRC, OPENED_SRC]) if (map.getSource(id)) map.removeSource(id);
}

export function setUploads(map: MapLibreMap, contributions: readonly Contribution[]): void {
  const source = map.getSource<GeoJSONSource>(UPLOADS_SRC);
  source?.setData(uploadsData(contributions));
}

export function setOpened(map: MapLibreMap, detail: ContributionDetail | null): void {
  const source = map.getSource<GeoJSONSource>(OPENED_SRC);
  source?.setData(openedData(detail));
}

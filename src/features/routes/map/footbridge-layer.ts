import type { MapLibreMap } from 'maplibre-gl';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';

import { FOOTBRIDGE_LAYERS, FOOTBRIDGE_MIN_ZOOM } from './footbridge-zoom';
import { fetchFootbridges } from '../published/fetch-footbridges';
import type { Footbridge } from '../published/footbridge-file-schema';

/** The footbridges as GeoJSON: each a multi-line, and each elevator a point. Steps are not drawn (answer 3). */
export function footbridgeFeatures(footbridges: readonly Footbridge[]) {
  return {
    type: 'FeatureCollection' as const,
    features: footbridges.flatMap((footbridge) => [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'MultiLineString' as const,
          coordinates: footbridge.lines.map((l) => [...l]),
        },
        properties: { id: footbridge.id, name: footbridge.name, covered: footbridge.isCovered },
      },
      ...footbridge.access
        .filter((point) => point.kind === 'elevator')
        .map((point) => ({
          type: 'Feature' as const,
          geometry: { type: 'Point' as const, coordinates: [...point.point] },
          properties: { kind: 'elevator' as const },
        })),
    ]),
  };
}

/**
 * The first of our own layers on the map, so the footbridges go under the routes, the hotspots and
 * everything else drawn from our GeoJSON sources, and over the basemap.
 */
function firstOfOurs(map: MapLibreMap): string | undefined {
  const style = map.getStyle();
  const ours = new Set(
    Object.entries(style.sources)
      .filter(([id, source]) => source.type === 'geojson' && id !== FOOTBRIDGE_LAYERS.source)
      .map(([id]) => id),
  );
  return style.layers.find((layer) => 'source' in layer && ours.has(layer.source))?.id;
}

/**
 * The footbridges on `map` (.scratch/footbridges, ticket 02): a line for each, an elevator a small
 * ringed dot, from FOOTBRIDGE_MIN_ZOOM in. They take no taps (answer 4). A look for now; the owner
 * designs it. A GeoJSON source, so a basemap switch carries it across (basemap.ts).
 */
export function addFootbridgeLayer(map: MapLibreMap, footbridges: readonly Footbridge[]): void {
  if (map.getSource(FOOTBRIDGE_LAYERS.source)) return;
  map.addSource(FOOTBRIDGE_LAYERS.source, {
    type: 'geojson',
    data: footbridgeFeatures(footbridges),
  });
  const before = firstOfOurs(map);
  map.addLayer(
    {
      id: FOOTBRIDGE_LAYERS.line,
      type: 'line',
      source: FOOTBRIDGE_LAYERS.source,
      minzoom: FOOTBRIDGE_MIN_ZOOM,
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': MAP_PAINT['Paint/footbridge'],
        'line-width': ['interpolate', ['linear'], ['zoom'], 15, 2, 18, 5],
      },
    },
    before,
  );
  map.addLayer(
    {
      id: FOOTBRIDGE_LAYERS.elevator,
      type: 'circle',
      source: FOOTBRIDGE_LAYERS.source,
      minzoom: FOOTBRIDGE_MIN_ZOOM,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-color': MAP_PAINT['Paint/footbridge-elevator'],
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 15, 3, 18, 5],
        'circle-stroke-color': MAP_PAINT['Paint/casing'],
        'circle-stroke-width': 1.5,
      },
    },
    before,
  );
}

/**
 * The footbridge file read (once a page), then its layer added to `map` while `isWanted` still
 * says so (the map not gone meanwhile). Rejects when the file cannot be read: offline before it
 * was kept, the map simply draws none.
 */
export async function showFootbridges(map: MapLibreMap, isWanted: () => boolean): Promise<void> {
  const footbridges = await fetchFootbridges();
  if (isWanted()) addFootbridgeLayer(map, footbridges);
}

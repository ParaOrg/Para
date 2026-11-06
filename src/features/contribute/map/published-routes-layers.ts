import type { MapLibreMap } from 'maplibre-gl';

import { firstLayerOfType } from '@/features/routes/map/layers';
import { RAIL_AT_REST, ROAD_AT_REST } from '@/features/routes/map/rail-rest-layers';
import { TRAIL_SRC } from '@/features/routes/map/recording-trail';

/*
 * The published routes' source and layer ids (published-routes.ts), apart so what only
 * needs their names (the History picture, capture-trail-picture.ts) does not fetch the reader;
 * and the layer the routes and the hotspots' boxes go under (layerToGoUnder), here so the two
 * drawings, each in a chunk of its own, agree on one place.
 */

export const PUBLISHED_SRC = 'published-routes';
export const PUBLISHED_CASING = 'published-routes-casing';
export const PUBLISHED_LINE = 'published-routes-line';

/**
 * The public map's other resting layers under ids of this source's own: each road mode that rests
 * in a colour of its own (UV Express, E-Jeep, Bus, the ferry), then each train line in its pale.
 * `restId` is the public map's id, whose filter the layer takes.
 */
export const PUBLISHED_RESTING = [
  ...Object.values(ROAD_AT_REST),
  ...Object.values(RAIL_AT_REST),
].map(({ id, colour }) => ({ id: `published-${id}`, restId: id, colour }));

/** Every layer the routes are drawn with, bottom to top. */
export const PUBLISHED_LAYERS = [
  PUBLISHED_CASING,
  PUBLISHED_LINE,
  ...PUBLISHED_RESTING.map(({ id }) => id),
];

/**
 * Where the routes go, and the hotspots' boxes under them: under the trail, whose layers are on
 * top of the map's labels as it is added and under them after a basemap switch (basemap.ts), and
 * under the labels, so a road painted blue still shows its name. The same layer for both, so
 * the boxes stay under the routes whichever of the two is drawn first.
 */
export function layerToGoUnder(map: MapLibreMap): string | undefined {
  const trail = map.getLayersOrder().find((id) => map.getLayer(id)?.source === TRAIL_SRC);
  const label = firstLayerOfType(map, 'symbol');
  if (!trail) return label;
  if (!label) return trail;
  const order = map.getLayersOrder();
  return order.indexOf(trail) < order.indexOf(label) ? trail : label;
}

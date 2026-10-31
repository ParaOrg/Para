import type { GeoJSONSource, LineLayerSpecification, MapLibreMap } from 'maplibre-gl';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';
import { firstLayerOfType } from '@/features/routes/map/layers';
import { CASING_EXTRA, roadWidth } from '@/features/routes/map/line-style';
import { RAIL_AT_REST, RESTING_FILTER, ROUTES_LINE } from '@/features/routes/map/rail-rest-layers';
import { TRAIL_SRC } from '@/features/routes/map/recording-trail';
import { routesData, unpatched } from '@/features/routes/map/saved-routes-data';
import { directionLine, type LineStringGeoJSON } from '@/features/routes/model/routes';
import { fetchIndex } from '@/features/routes/published/fetch-index';
import { fetchLine } from '@/features/routes/published/fetch-line';

/*
 * The published routes behind a recording: every direction on the published map, painted as the
 * public map paints one at rest (the light blue, and each train line in its own pale), so a
 * contributor sees which roads Para already has. Only a picture: no tap area, no lighting, no card.
 * Its own source and layer ids, so nothing that listens for the public map's routes hears these.
 */

export const PUBLISHED_SRC = 'published-routes';
const CASING = 'published-routes-casing';
const LINE = 'published-routes-line';

/** The resting layers, the public map's paint under ids of their own: the light blue's and each train line's. */
const RESTING = [
  {
    id: LINE,
    filter: RESTING_FILTER[ROUTES_LINE],
    colour: MAP_COLOURS['Map/RouteLine/surface-default'],
  },
  ...Object.values(RAIL_AT_REST).map(({ id, colour }) => ({
    id: `published-${id}`,
    filter: RESTING_FILTER[id],
    colour,
  })),
];

/** Every layer this file adds, bottom to top: what the suites read. */
export const PUBLISHED_LAYERS = [CASING, ...RESTING.map(({ id }) => id)];

/** From this zoom an overview's corners show on a street: the public map's FULL_LINES_FROM. */
const FULL_LINES_FROM = 15;

/**
 * Where the routes go: under the trail, whose layers are on top of the map's labels as it is
 * added and under them after a basemap switch (basemap.ts), and under the labels, so a road
 * painted blue still shows its name.
 */
function layerToGoUnder(map: MapLibreMap): string | undefined {
  const trail = map.getLayersOrder().find((id) => map.getLayer(id)?.source === TRAIL_SRC);
  const label = firstLayerOfType(map, 'symbol');
  if (!trail) return label;
  if (!label) return trail;
  const order = map.getLayersOrder();
  return order.indexOf(trail) < order.indexOf(label) ? trail : label;
}

function lineLayer(
  id: string,
  colour: string,
  width: LineLayerSpecification['paint'],
): LineLayerSpecification {
  return {
    id,
    type: 'line',
    source: PUBLISHED_SRC,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': colour, ...width },
  };
}

/**
 * Reads the published index and draws its directions on `map`, then their full lines for the
 * ones on screen at street zoom, as the public map does. Resolves with what takes the routes off
 * again; rejects when the index cannot be read, and the map then shows no routes.
 */
export async function drawPublishedRoutes(map: MapLibreMap): Promise<() => void> {
  const { directions } = await fetchIndex();
  if (map.getSource(PUBLISHED_SRC)) return () => undefined;

  const under = layerToGoUnder(map);
  // `promoteId`: a full line replaces its overview by the direction's id.
  map.addSource(PUBLISHED_SRC, { type: 'geojson', promoteId: 'id', data: routesData(directions) });
  map.addLayer(
    lineLayer(CASING, MAP_PAINT['Paint/casing'], { 'line-width': roadWidth(CASING_EXTRA) }),
    under,
  );
  for (const { id, filter, colour } of RESTING) {
    map.addLayer({ ...lineLayer(id, colour, { 'line-width': roadWidth(0) }), filter }, under);
  }

  // Only a drawn direction has a line file: the host answers a missing one with the page.
  const drawn = new Set(
    directions.filter((direction) => directionLine(direction).length > 1).map(({ id }) => id),
  );
  const asked = new Set<string>();
  const sent = new Map<string, LineStringGeoJSON>();
  const arrived = new Map<string, LineStringGeoJSON>();
  let isRemoved = false;

  const patch = () => {
    const source = map.getSource<GeoJSONSource>(PUBLISHED_SRC);
    const update = unpatched(sent, arrived);
    if (source && update.length > 0) source.updateData({ update });
  };
  const readInView = () => {
    if (map.getZoom() < FULL_LINES_FROM || !map.getLayer(LINE)) return;
    for (const feature of map.queryRenderedFeatures({ layers: RESTING.map(({ id }) => id) })) {
      const id = String(feature.properties.id ?? '');
      if (!id || asked.has(id) || !drawn.has(id)) continue;
      asked.add(id);
      fetchLine(id).then(
        (line) => {
          if (!line || isRemoved) return;
          arrived.set(id, line);
          patch();
        },
        // Not asked again this page, offline or not: the overview stays, the same road.
        () => undefined,
      );
    }
  };
  readInView();
  map.on('idle', readInView);

  return () => {
    isRemoved = true;
    map.off('idle', readInView);
    for (const id of [...PUBLISHED_LAYERS].reverse()) {
      if (map.getLayer(id)) map.removeLayer(id);
    }
    if (map.getSource(PUBLISHED_SRC)) map.removeSource(PUBLISHED_SRC);
  };
}

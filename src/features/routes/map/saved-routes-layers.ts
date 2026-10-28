import type { MapLibreMap } from 'maplibre-gl';

import { MAP_COLOURS, MAP_PAINT } from '@/design-system/foundation/map-colours';

import { LAYERS, firstLayerOfType } from './layers';
import { litOpacity } from './lighting';
import { CASING_EXTRA, litWidth, roadWidth } from './line-style';
import { RAIL_AT_REST, RESTING_FILTER, ROUTES_LINE } from './rail-rest-layers';
import { routesData } from './saved-routes-data';
import { ROUTES_HIT_LAYER } from './tap';
import type { Direction } from '../model/routes';

/*
 * The saved directions on the map: their source and their layers (five, and
 * a resting one for each train line). What lights them is lighting.ts's, and
 * the hook that keeps them in step is use-saved-routes-layers.ts.
 */

export const SRC = 'saved-routes';
export const CASING = LAYERS.routesCasing;
const LINE = ROUTES_LINE;
/** The lit directions, drawn again on top: thick, in the selected blue, or on the public map in a picked card's or an open trip's colour. */
export const SELECTED_CASING = 'saved-routes-selected-casing';
export const SELECTED = LAYERS.routesLit;
/** The two that draw the lit directions only, switched off while none is (layer-switch.ts). */
export const LIT_LAYERS = [SELECTED_CASING, SELECTED] as const;
export const HIT = ROUTES_HIT_LAYER;

/**
 * The saved directions' source, laid out from `rows`, and its layers,
 * added to `map` under the basemap's first label: what useSavedRoutesLayers
 * adds once a map is there, apart so a unit check can read it
 * (map-sources-test).
 */
export function addSavedRoutes(
  map: Pick<MapLibreMap, 'addSource' | 'addLayer' | 'getLayersOrder' | 'getLayer'>,
  rows: readonly Direction[] = [],
): void {
  // Under the basemap's labels, so a road painted blue still shows its
  // name. The draft's layers, when there are any, sit above the labels and
  // so above these too.
  const before = firstLayerOfType(map, 'symbol');

  // `promoteId`: the feature state a tap sets is keyed on the direction's id.
  map.addSource(SRC, {
    type: 'geojson',
    promoteId: 'id',
    data: routesData(rows),
  });
  map.addLayer(
    {
      id: CASING,
      type: 'line',
      source: SRC,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': MAP_PAINT['Paint/casing'], 'line-width': roadWidth(CASING_EXTRA) },
    },
    before,
  );
  map.addLayer(
    {
      id: LINE,
      type: 'line',
      source: SRC,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      filter: RESTING_FILTER[LINE],
      paint: {
        'line-color': MAP_COLOURS['Map/RouteLine/surface-default'],
        'line-width': roadWidth(0),
      },
    },
    before,
  );
  for (const { id, colour } of Object.values(RAIL_AT_REST))
    map.addLayer(
      {
        id,
        type: 'line',
        source: SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        filter: RESTING_FILTER[id],
        paint: { 'line-color': colour, 'line-width': roadWidth(0) },
      },
      before,
    );
  // The lit directions — the one chosen, the Selected card's, or else
  // everything a list or a hotspot's card shows — drawn once more above the
  // rest, in the selected blue (or a card's, useLitLineColour): over a
  // shared road, they are the line that shows. Every direction is in these
  // layers, the unlit ones switched off: a filter naming the lit ones would
  // lay the whole source out again at every tap (see `useLighting`).
  map.addLayer(
    {
      id: SELECTED_CASING,
      type: 'line',
      source: SRC,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': MAP_PAINT['Paint/casing'],
        'line-width': litWidth(CASING_EXTRA),
        'line-opacity': litOpacity(),
        // Switched off while nothing is lit, and from the start (layer-switch.ts): at once, never between.
        'line-layer-opacity': 0,
        'line-layer-opacity-transition': { duration: 0, delay: 0 },
      },
    },
    before,
  );
  map.addLayer(
    {
      id: SELECTED,
      type: 'line',
      source: SRC,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': MAP_COLOURS['Map/RouteLine/surface-selected'],
        // A new colour shows with the lighting it goes with, in the same
        // frame: MapLibre's default 300 ms fade would draw the next card's
        // routes in the last card's colour for a moment.
        'line-color-transition': { duration: 0, delay: 0 },
        'line-width': litWidth(),
        'line-opacity': litOpacity(),
        'line-layer-opacity': 0,
        'line-layer-opacity-transition': { duration: 0, delay: 0 },
      },
    },
    before,
  );
  map.addLayer(
    {
      id: HIT,
      type: 'line',
      source: SRC,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': MAP_PAINT['Paint/hit'],
        'line-width': roadWidth(14),
        'line-opacity': 0,
      },
    },
    before,
  );
}

/**
 * Whether the frame `map` has just rendered drew the routes: their resting
 * line layer is in, their source is loaded, and the tiles the map drew of it
 * hold a route. Asked at each 'render', it is true from the first frame that
 * draws them: MapLibre lays a source's tiles out between frames and fires
 * 'render' after drawing what it has (map.ts, _render). The same test as the
 * cheap-phone timer's "routes drawn" (phoneSpeedParts.mjs, routesOnMap), for
 * the same reason as its last part: the public map's source is added empty
 * when the style is in before the map file, and an empty GeoJSON source loads
 * like any other. In this order, each part only once the one before holds:
 * isSourceLoaded fires an 'error' on the map for a source it does not have,
 * and MapView says "The map failed to load" for an 'error' before the map's
 * 'load'; and the tiles are read only once they are all in, under 1 ms on an
 * empty source's and 1.6-6.6 ms at 4x CPU, once, for the opening view's 80
 * routes (measured for the timer). Read by MapView's "Loading map…"
 * (framing.ts, loadingLifts; the owner's call).
 */
export function routesDrawn(
  map: Pick<MapLibreMap, 'getSource' | 'getLayer' | 'isSourceLoaded' | 'querySourceFeatures'>,
): boolean {
  return !!(
    map.getSource(SRC) &&
    map.getLayer(LINE) &&
    map.isSourceLoaded(SRC) &&
    map.querySourceFeatures(SRC).length > 0
  );
}

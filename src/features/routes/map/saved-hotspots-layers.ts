import type { MapLibreMap } from 'maplibre-gl';

import { MAP_OPACITY } from '@/design-system/foundation/map-colours';

import { HOTSPOT_COLOUR, HOTSPOT_CONTENT, HOTSPOT_OPACITY } from './colours';
import { hatch, hatchOf } from './hotspot-hatch';
import { LAYERS, firstLayerOfType } from './layers';
import { hotspotsData } from './saved-hotspots-data';
import { HINTUAN_LABEL, LABEL, addHotspotLabels, labelsOf } from './saved-hotspots-labels';
import { HOTSPOTS_FILL_LAYER } from './tap';
import type { Hotspot } from '../model/hotspots';

/*
 * The saved hotspots on the map: their source, the place wash's, their
 * layers, and what a tap marks on them.
 */

export const SRC = 'saved-stops';
export const FILL = HOTSPOTS_FILL_LAYER;
const OUTLINE = 'saved-stops-outline';

/** A flag of the feature state a tap sets on a box: `lit`, `sibling` or `chosen`. */
const state = (name: 'lit' | 'sibling' | 'chosen') =>
  ['boolean', ['feature-state', name], false] as const;
/** The boxes under a tap, or the chosen one, striped while they are asked about: the HotspotOverlayCard's State=Selected. */
export const HATCH = 'saved-stops-hatch';
export const HATCH_LAYERS = [HATCH] as const;

/**
 * How much stronger a sibling box's fill is drawn over its own, a hintuan's
 * to Map/OverlayCard/Hintuan/surface-selected (60% over 30%).
 */
const HINTUAN_STRONGER =
  1 - (1 - MAP_OPACITY['Map/OverlayCard/Hintuan/surface-selected']) / (1 - HOTSPOT_OPACITY.hintuan);

/**
 * The place highlight: tap one box and its siblings — the boxes sharing its
 * informal name — draw stronger, and a soft wash over the hull of all of them
 * says "one place". Studio and public map alike. The wash has its own source,
 * rebuilt when the selection changes.
 */
export const SIBLINGS = 'saved-stops-siblings';
export const SIBLING_LAYERS = [SIBLINGS] as const;
export const WASH_SRC = 'place-wash';
const WASH = 'place-wash-fill';
const WASH_EDGE = 'place-wash-edge';

/**
 * Hotspots sit under the route lines; a route drawn right under the tapped
 * pixel still wins the click, and one merely near it shares a chooser.
 */
const ROUTES_ABOVE = LAYERS.routesCasing;
const DRAW_ABOVE = LAYERS.drawCasing;

/**
 * The filter of each layer drawn from the hotspots' source, the box being
 * edited (`hidden`, '' for none) left out: what the studio sets as it opens
 * an outline, and sets back once it is closed. The boxes' layers get one
 * filter, SIBLINGS too. MapLibre's worker lays out the layers of a source
 * that share a type, a filter and a layout as one bucket; left on its first
 * filter, SIBLINGS would be a fill bucket of its own, every box triangulated
 * and uploaded a second time. It never draws the box being edited: the studio
 * closes the hotspot's card, and its siblings' marks with it, before it opens
 * the outline, and takes no tap on a box while one is open.
 */
export function hiddenHotspotFilters(hidden: string): [string, unknown][] {
  const boxes = ['all', ['==', ['geometry-type'], 'Polygon'], ['!=', ['get', 'id'], hidden]];
  return [
    [FILL, boxes],
    [OUTLINE, boxes],
    [SIBLINGS, boxes],
    [HATCH, boxes],
    [LABEL, labelsOf('terminal', hidden)],
    [HINTUAN_LABEL, labelsOf('hintuan', hidden)],
  ];
}

/**
 * The saved hotspots' source, laid out from `hotspots`, and the place wash's,
 * and their layers, added to `map` under the routes: what
 * useSavedHotspotsLayers adds once a map is there, apart so a unit check can
 * read it (map-sources-test).
 */
export function addSavedHotspots(
  map: Pick<
    MapLibreMap,
    'addSource' | 'addLayer' | 'getLayersOrder' | 'getLayer' | 'hasImage' | 'addImage'
  >,
  hotspots: readonly Hotspot[] = [],
): void {
  // Under the routes, under the draft, and under the basemap's labels in
  // any case: a box never hides a street name.
  const before = map.getLayer(ROUTES_ABOVE)
    ? ROUTES_ABOVE
    : map.getLayer(DRAW_ABOVE)
      ? DRAW_ABOVE
      : firstLayerOfType(map, 'symbol');

  // `promoteId`: the feature state a tap sets is keyed on the hotspot's id
  // (its box and its label point share it, so both carry the state).
  map.addSource(SRC, {
    type: 'geojson',
    promoteId: 'id',
    data: hotspotsData(hotspots),
  });
  map.addSource(WASH_SRC, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  });
  // The wash sits under every box: a tint that joins them, never a thing to tap.
  map.addLayer(
    {
      id: WASH,
      type: 'fill',
      source: WASH_SRC,
      paint: { 'fill-color': HOTSPOT_COLOUR.terminal, 'fill-opacity': 0.1 },
    },
    before,
  );
  map.addLayer(
    {
      id: WASH_EDGE,
      type: 'line',
      source: WASH_SRC,
      layout: { 'line-join': 'round' },
      paint: {
        'line-color': HOTSPOT_COLOUR.terminal,
        'line-width': 1.5,
        'line-opacity': 0.5,
        'line-dasharray': [2, 2],
      },
    },
    before,
  );
  // The HotspotOverlayCard (Figma 3837:11308): the box's surface see-through,
  // its edge and name in its content colour.
  const byKind = (terminal: string | number, hintuan: string | number) =>
    ['match', ['get', 'kind'], 'terminal', terminal, hintuan] as never;
  const colour = byKind(HOTSPOT_COLOUR.terminal, HOTSPOT_COLOUR.hintuan);
  const content = byKind(HOTSPOT_CONTENT.terminal, HOTSPOT_CONTENT.hintuan);
  for (const kind of ['terminal', 'hintuan'] as const) {
    if (!map.hasImage(hatchOf(kind)))
      map.addImage(hatchOf(kind), hatch(HOTSPOT_CONTENT[kind]), { pixelRatio: 2 });
  }
  map.addLayer(
    {
      id: FILL,
      type: 'fill',
      source: SRC,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': colour,
        'fill-opacity': byKind(HOTSPOT_OPACITY.terminal, HOTSPOT_OPACITY.hintuan),
      },
    },
    before,
  );
  map.addLayer(
    {
      id: OUTLINE,
      type: 'line',
      source: SRC,
      filter: ['==', ['geometry-type'], 'Polygon'],
      layout: { 'line-join': 'round' },
      // 0.6 as drawn, chosen or not: the stripes say which is chosen.
      paint: { 'line-color': content, 'line-width': 0.6 },
    },
    before,
  );
  // The chosen box's siblings, drawn stronger than the rest and outlined.
  // Every box is in this layer and the lit one, at opacity 0 unless its
  // feature state says so: a filter naming the boxes would lay the whole
  // source out again at every tap (see useLighting in saved-routes-layers.ts).
  map.addLayer(
    {
      id: SIBLINGS,
      type: 'fill',
      source: SRC,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-color': colour,
        'fill-opacity': ['case', state('sibling'), byKind(0.3, HINTUAN_STRONGER), 0] as never,
        // Switched off while no box is a sibling, and from the start (layer-switch.ts): at once, never between.
        'fill-layer-opacity': 0,
        'fill-layer-opacity-transition': { duration: 0, delay: 0 },
      },
    },
    before,
  );
  // The lit boxes — the one chosen, or everything under a tap while the
  // sheet asks which — striped; the Selected variants keep the Rest surface
  // under the stripes.
  map.addLayer(
    {
      id: HATCH,
      type: 'fill',
      source: SRC,
      filter: ['==', ['geometry-type'], 'Polygon'],
      paint: {
        'fill-pattern': [
          'match',
          ['get', 'kind'],
          'terminal',
          hatchOf('terminal'),
          hatchOf('hintuan'),
        ] as never,
        'fill-opacity': ['case', state('lit'), 1, 0] as never,
        'fill-layer-opacity': 0,
        'fill-layer-opacity-transition': { duration: 0, delay: 0 },
      },
    },
    before,
  );
  addHotspotLabels(map, SRC);
}

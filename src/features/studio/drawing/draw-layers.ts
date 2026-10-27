import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { MAP_PAINT } from '@/design-system/foundation/map-colours';
import { LAYERS } from '@/features/routes/map/layers';

/**
 * What the drawing paints on the map: its sources and layers, laid once
 * (useDrawLayers); the data and colours they show as the drawing changes are
 * useDrawRendering's (use-draw-rendering.ts), from draw-features.ts. The
 * `draw-*` ids are a contract — the suites read them — and never change.
 */

const EMPTY = { type: 'FeatureCollection', features: [] } as const;

export const LINE_SRC = 'draw-line';
export const POINT_SRC = 'draw-points';
export const AREA_SRC = 'draw-area';
export const UTURN_SRC = 'draw-uturns';
export const BORROW_SRC = 'draw-borrow';
/** The drawing's points, and the wide invisible line a click finds: the events' layers. */
export const POINT_LAYER = 'draw-point-dots';
export const HIT_LAYER = 'draw-line-hit';
/** The ring round the point a finger selected. */
export const SELECTED_LAYER = 'draw-point-selected';
export const AREA_FILL_LAYER = 'draw-area-fill';

export const ROUTE_COLOUR = MAP_PAINT['Paint/draw-line'];
const UTURN_COLOUR = MAP_PAINT['Paint/draw-uturn'];

const BORROW_COLOUR = MAP_PAINT['Paint/draw-borrow'];

/** The closing edge of an area is a feature in the line source with this index. */
export const CLOSING = -1;

/** The drawing's sources and layers, added once the map is there. */
export function useDrawLayers(map: MapLibreMap | null): void {
  useEffect(() => {
    if (!map || map.getSource(LINE_SRC)) return;

    map.addSource(LINE_SRC, { type: 'geojson', data: EMPTY });
    map.addSource(POINT_SRC, { type: 'geojson', data: EMPTY });
    map.addSource(AREA_SRC, { type: 'geojson', data: EMPTY });
    map.addSource(UTURN_SRC, { type: 'geojson', data: EMPTY });
    map.addSource(BORROW_SRC, { type: 'geojson', data: EMPTY });

    // The hotspot fill sits under its own outline and under the route layers.
    map.addLayer({
      id: AREA_FILL_LAYER,
      type: 'fill',
      source: AREA_SRC,
      paint: { 'fill-color': ROUTE_COLOUR, 'fill-opacity': 0.18 },
    });
    // The direction being extended, while its spot is picked: wide and pale,
    // so the tap has something to land on, with the spot as a ringed dot.
    map.addLayer({
      id: 'draw-borrow-line',
      type: 'line',
      source: BORROW_SRC,
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': BORROW_COLOUR, 'line-width': 10, 'line-opacity': 0.35 },
    });
    map.addLayer({
      id: 'draw-borrow-spot',
      type: 'circle',
      source: BORROW_SRC,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 8,
        'circle-color': MAP_PAINT['Paint/casing'],
        'circle-stroke-color': BORROW_COLOUR,
        'circle-stroke-width': 3,
      },
    });
    map.addLayer({
      id: LAYERS.drawCasing,
      type: 'line',
      source: LINE_SRC,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': MAP_PAINT['Paint/casing'], 'line-width': 8, 'line-opacity': 0.9 },
    });
    // Routed and freehand are separate layers because line-dasharray cannot be
    // driven by a feature property.
    map.addLayer({
      id: LAYERS.drawSnapped,
      type: 'line',
      source: LINE_SRC,
      filter: ['==', ['get', 'snap'], 'snapped'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': ROUTE_COLOUR, 'line-width': 4 },
    });
    map.addLayer({
      id: LAYERS.drawFreehand,
      type: 'line',
      source: LINE_SRC,
      filter: ['==', ['get', 'snap'], 'freehand'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ROUTE_COLOUR,
        'line-width': 4,
        'line-dasharray': [2, 1.5],
      },
    });
    // Where the route turns back on itself, the doubled-back stretch overlaps
    // or runs beside the line and would be invisible. Paint it amber over it.
    map.addLayer({
      id: 'draw-uturn-stub',
      type: 'line',
      source: UTURN_SRC,
      filter: ['==', ['geometry-type'], 'LineString'],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': UTURN_COLOUR, 'line-width': 5 },
    });
    // A 4px line is far too thin to hit reliably; this invisible one is not.
    map.addLayer({
      id: HIT_LAYER,
      type: 'line',
      source: LINE_SRC,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: { 'line-color': MAP_PAINT['Paint/hit'], 'line-width': 22, 'line-opacity': 0 },
    });
    // …and ring the control point it turns at.
    map.addLayer({
      id: 'draw-uturn-ring',
      type: 'circle',
      source: UTURN_SRC,
      filter: ['==', ['geometry-type'], 'Point'],
      paint: {
        'circle-radius': 12,
        'circle-opacity': 0,
        'circle-stroke-color': UTURN_COLOUR,
        'circle-stroke-width': 3,
      },
    });
    map.addLayer({
      id: POINT_LAYER,
      type: 'circle',
      source: POINT_SRC,
      paint: {
        'circle-radius': 6,
        'circle-color': MAP_PAINT['Paint/casing'],
        'circle-stroke-color': ROUTE_COLOUR,
        'circle-stroke-width': 2.5,
      },
    });
    map.addLayer({
      id: SELECTED_LAYER,
      type: 'circle',
      source: POINT_SRC,
      filter: ['==', ['get', 'selected'], true],
      paint: {
        'circle-radius': 12,
        'circle-opacity': 0,
        'circle-stroke-color': ROUTE_COLOUR,
        'circle-stroke-width': 3,
      },
    });
  }, [map]);
}

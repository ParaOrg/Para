import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { HOTSPOT_COLOUR } from '@/features/routes/map/colours';
import { LAYERS } from '@/features/routes/map/layers';
import type { LngLat, Segment } from '@/shared/utils/geo';

import {
  areaFeatures,
  borrowFeatures,
  lineFeatures,
  pointFeatures,
  uTurnFeatures,
} from './draw-features';
import {
  AREA_FILL_LAYER,
  AREA_SRC,
  BORROW_SRC,
  LINE_SRC,
  POINT_LAYER,
  POINT_SRC,
  ROUTE_COLOUR,
  SELECTED_LAYER,
  UTURN_SRC,
  isGeoJSON,
} from './draw-layers';
import type { AreaTarget, Picking } from './drawing-types';
import type { UTurn } from './uturns';

interface DrawRenderingState {
  segments: Segment[];
  controlPoints: LngLat[];
  area: AreaTarget | null;
  uTurns: UTurn[];
  picking: Picking | null;
  selected: number | null;
}

/**
 * The drawing on the map: its segments (routed and freehand), points, a
 * hotspot's fill and closing edge, the U-turns ringed, the line being picked
 * for Extend, the point a finger selected ringed, and the colours of a route
 * or a hotspot's kind. What each source holds is draw-features.ts'.
 */
export function useDrawRendering(
  map: MapLibreMap | null,
  { segments, controlPoints, area, uTurns, picking, selected }: DrawRenderingState,
): void {
  useEffect(() => {
    if (!map) return;
    const lineSrc = map.getSource(LINE_SRC);
    const pointSrc = map.getSource(POINT_SRC);
    if (!isGeoJSON(lineSrc) || !isGeoJSON(pointSrc)) return;
    lineSrc.setData(lineFeatures(segments, controlPoints, area));
    pointSrc.setData(pointFeatures(controlPoints, selected));
    const areaSrc = map.getSource(AREA_SRC);
    if (isGeoJSON(areaSrc)) areaSrc.setData(areaFeatures(controlPoints, area));
    const uturnSrc = map.getSource(UTURN_SRC);
    if (isGeoJSON(uturnSrc)) uturnSrc.setData(uTurnFeatures(uTurns, controlPoints));
  }, [map, segments, controlPoints, area, uTurns, selected]);

  useEffect(() => {
    if (!map) return;
    const src = map.getSource(BORROW_SRC);
    if (!isGeoJSON(src)) return;
    src.setData(borrowFeatures(picking));
  }, [map, picking]);

  // Route traces are rose; a hotspot trace takes its kind's colour, and its
  // straight edges are drawn solid rather than in the freehand dash.
  useEffect(() => {
    if (!map || !map.getLayer(AREA_FILL_LAYER)) return;
    const colour = area ? HOTSPOT_COLOUR[area.kind] : ROUTE_COLOUR;
    map.setPaintProperty(LAYERS.drawSnapped, 'line-color', colour);
    map.setPaintProperty(LAYERS.drawFreehand, 'line-color', colour);
    map.setPaintProperty(LAYERS.drawFreehand, 'line-dasharray', area ? [1, 0] : [2, 1.5]);
    map.setPaintProperty(POINT_LAYER, 'circle-stroke-color', colour);
    map.setPaintProperty(SELECTED_LAYER, 'circle-stroke-color', colour);
    map.setPaintProperty(AREA_FILL_LAYER, 'fill-color', colour);
  }, [map, area]);
}

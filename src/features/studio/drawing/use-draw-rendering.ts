import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { LAYERS } from '@/features/routes/map/layers';
import type { LngLat, Segment } from '@/shared/utils/geo';

import {
  areaFeatures,
  borrowFeatures,
  handleFeatures,
  lineFeatures,
  pointFeatures,
  uTurnFeatures,
} from './draw-features';
import {
  AREA_FILL_LAYER,
  AREA_SRC,
  BORROW_SRC,
  HANDLE_SRC,
  LINE_SRC,
  POINT_SRC,
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
 * for Extend, and the point a finger selected ringed. What each source holds
 * is draw-features.ts'.
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
    const handleSrc = map.getSource(HANDLE_SRC);
    if (isGeoJSON(handleSrc)) handleSrc.setData(handleFeatures(segments, area));
  }, [map, segments, controlPoints, area, uTurns, selected]);

  useEffect(() => {
    if (!map) return;
    const src = map.getSource(BORROW_SRC);
    if (!isGeoJSON(src)) return;
    src.setData(borrowFeatures(picking));
  }, [map, picking]);

  // A hotspot trace's straight edges are drawn solid rather than in the
  // freehand dash. Both kinds are drawn in the route's colour: the kind shows
  // once the box is saved.
  useEffect(() => {
    if (!map || !map.getLayer(AREA_FILL_LAYER)) return;
    map.setPaintProperty(LAYERS.drawFreehand, 'line-dasharray', area ? [1, 0] : [2, 1.5]);
  }, [map, area]);
}

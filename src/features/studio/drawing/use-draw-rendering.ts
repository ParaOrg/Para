import type { MapLibreMap } from 'maplibre-gl';
import { useEffect, type RefObject } from 'react';

import type { LngLat, Segment } from '@/shared/utils/geo';

import {
  areaFeatures,
  borrowFeatures,
  handleFeatures,
  handlePoints,
  lineFeatures,
  pointFeatures,
  uTurnFeatures,
} from './draw-features';
import {
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
  /** The point the mouse selected, whose handles show beside the last two's; none in Snap. */
  handlesAt: number | null;
  isFreehand: boolean;
  /** The handle the last point, placed smooth, sends the stretch still to come. */
  pendingOut: RefObject<{ point: LngLat; out: LngLat } | null>;
}

/**
 * The drawing on the map: its segments (routed and freehand), points, a
 * hotspot's fill and closing edge, the U-turns ringed, the line being picked
 * for Extend, the point a finger selected ringed, and the handles of the
 * last two points and the one the mouse selected, in Draw. What each source holds is draw-features.ts'.
 */
export function useDrawRendering(
  map: MapLibreMap | null,
  {
    segments,
    controlPoints,
    area,
    uTurns,
    picking,
    selected,
    handlesAt,
    isFreehand,
    pendingOut,
  }: DrawRenderingState,
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
    if (isGeoJSON(handleSrc)) {
      // In Snap nothing shows handles: only Draw's stretches bend.
      const shown = isFreehand ? handlePoints(handlesAt, controlPoints.length) : [];
      handleSrc.setData(handleFeatures(segments, controlPoints, area, shown, pendingOut.current));
    }
  }, [map, segments, controlPoints, area, uTurns, selected, handlesAt, isFreehand, pendingOut]);

  useEffect(() => {
    if (!map) return;
    const src = map.getSource(BORROW_SRC);
    if (!isGeoJSON(src)) return;
    src.setData(borrowFeatures(picking));
  }, [map, picking]);
}

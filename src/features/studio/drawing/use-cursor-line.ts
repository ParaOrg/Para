import type { MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import { useEffect, type RefObject } from 'react';

import { useLayerReady } from '@/features/routes/map/layers';
import type { LngLat, Segment } from '@/shared/utils/geo';

import { penStretch } from './curves';
import {
  HANDLE_ARM_WIDTH,
  HANDLE_DOT_LAYER,
  HIT_LAYER,
  POINT_LAYER,
  ROUTE_COLOUR,
  isGeoJSON,
} from './draw-layers';
import type { AreaTarget, Picking } from './drawing-types';
import { closeTargetOf, isNearClose } from './use-connect-hint';
import { previewFrom } from './use-snap-preview';

/**
 * Draw's line to the cursor, as a pen tool draws it: from the last point to
 * the pointer, the stretch a click there would add, so straight from a
 * corner and bent along a smooth point's handle. Solid and thin, in the
 * line's colour. By the closing point it runs to that point, where a click
 * closes the line. Before a borrowed end it runs from the point a click goes
 * in after.
 *
 * None in Snap (its preview is use-snap-preview.ts), for a hotspot, while a
 * line is picked for Extend, or before anything is drawn; none with a button
 * held (the pen shows its own stretch, draw-pen.ts) or over the line, a
 * point or a handle, where a click adds no stretch; and none on a touch
 * screen, which has no hovering cursor.
 */

const SRC = 'draw-cursor';
const CURSOR_LAYER = 'draw-cursor-line';

const EMPTY = { type: 'FeatureCollection', features: [] } as const;

/** What the line reads as the cursor moves: the drawing's own refs. */
export interface CursorLineRefs {
  points: RefObject<LngLat[]>;
  segments: RefObject<Segment[]>;
  freehand: RefObject<boolean>;
  area: RefObject<AreaTarget | null>;
  picking: RefObject<Picking | null>;
  join: RefObject<LngLat | null>;
  pendingOut: RefObject<{ point: LngLat; out: LngLat } | null>;
}

/**
 * The line to `to`: the stretch a click there would add; before a borrowed
 * end, straight from the point a click goes in after. Null when Draw would
 * add nothing.
 */
export function cursorLine(refs: CursorLineRefs, to: LngLat): LngLat[] | null {
  if (!refs.freehand.current || refs.area.current || refs.picking.current) return null;
  const points = refs.points.current;
  const join = refs.join.current;
  const hasJoin = !!join && points.includes(join);
  if (hasJoin) {
    const from = previewFrom(points, join, true);
    return from ? [from, to] : null;
  }
  const stretch = penStretch(
    points,
    refs.segments.current,
    false,
    refs.pendingOut.current,
    to,
    null,
  );
  return stretch?.coordinates ?? null;
}

/**
 * The line. `controlPoints` and `isFreehand` are the drawing's state: a
 * change to either (an undo, F for Snap) takes the line away until the
 * cursor next moves.
 */
export function useCursorLine(
  map: MapLibreMap | null,
  isDrawing: boolean,
  controlPoints: readonly LngLat[],
  isFreehand: boolean,
  refs: CursorLineRefs,
): void {
  const isPointReady = useLayerReady(map, POINT_LAYER);

  useEffect(() => {
    if (!map || !isPointReady || map.getSource(SRC)) return;
    map.addSource(SRC, { type: 'geojson', data: EMPTY });
    // Over the line, under the points: a point stays on top of the line leaving it.
    map.addLayer(
      {
        id: CURSOR_LAYER,
        type: 'line',
        source: SRC,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': ROUTE_COLOUR, 'line-width': HANDLE_ARM_WIDTH },
      },
      POINT_LAYER,
    );
  }, [map, isPointReady]);

  useEffect(() => {
    const src = map?.getSource(SRC);
    if (!map || !isDrawing || !isPointReady || !isGeoJSON(src)) return;

    const clear = () => src.setData(EMPTY);
    const handleMove = (e: MapMouseEvent) => {
      if (e.originalEvent.buttons !== 0) return clear();
      const over = map.queryRenderedFeatures(e.point, {
        layers: [POINT_LAYER, HIT_LAYER, HANDLE_DOT_LAYER],
      });
      const closeAt = closeTargetOf(map);
      const isClosing = !!closeAt && isNearClose(map, e.point, closeAt);
      if (over.length > 0 && !isClosing) return clear();
      const to: LngLat = closeAt && isClosing ? closeAt : [e.lngLat.lng, e.lngLat.lat];
      const line = cursorLine(refs, to);
      if (!line) return clear();
      src.setData({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } },
        ],
      });
    };

    map.on('mousemove', handleMove);
    map.on('mousedown', clear);
    map.on('mouseout', clear);
    return () => {
      map.off('mousemove', handleMove);
      map.off('mousedown', clear);
      map.off('mouseout', clear);
      clear();
    };
  }, [map, isDrawing, isPointReady, controlPoints, isFreehand, refs]);
}

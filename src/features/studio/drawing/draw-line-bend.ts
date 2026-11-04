import type { MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl';

import type { LngLat, Segment } from '@/shared/utils/geo';

import { bendThrough, grabAt } from './curve-handles';
import { CLICK_AFTER_MS, type DrawContext } from './draw-context';
import { CLOSING, HANDLE_DOT_LAYER, HIT_LAYER, POINT_LAYER } from './draw-layers';

/**
 * A Draw stretch bent by its line: a press on it and a drag pulls the curve
 * through the pointer, its two points staying put (bendThrough). A press let
 * go without a drag is a click, and inserts a point there (draw-clicks.ts);
 * shift still straightens. A routed stretch is not held: a drag on it pans. A
 * mouse's: a finger has the point bar.
 */

/** A press that moves this far is a drag: MapLibre's own click tolerance. */
const DRAG_PX = 3;

export function lineBendHandlers(ctx: DrawContext) {
  const { map, canvas, refs } = ctx;
  const { reshape } = ctx.actions;
  /** The stretch held: which, as it was, where along it, where the press was, and whether it has moved. */
  let held: {
    index: number;
    grabbed: Segment;
    t: number;
    from: LngLat;
    x: number;
    y: number;
    isDragging: boolean;
  } | null = null;

  const onMove = (e: MapMouseEvent) => {
    if (!held) return;
    if (!held.isDragging && Math.hypot(e.point.x - held.x, e.point.y - held.y) < DRAG_PX) return;
    held.isDragging = true;
    const by: LngLat = [e.lngLat.lng - held.from[0], e.lngLat.lat - held.from[1]];
    const next = [...refs.segments.current];
    next[held.index] = bendThrough(held.grabbed, held.t, by);
    reshape(next);
  };

  const onUp = () => {
    map.off('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    map.dragPan.enable();
    if (held?.isDragging) {
      canvas.style.cursor = 'crosshair';
      ctx.echo.until = performance.now() + CLICK_AFTER_MS;
    }
    held = null;
  };

  const onLineDown = (e: MapLayerMouseEvent) => {
    const index = e.features?.[0]?.properties?.index;
    if (e.originalEvent.button !== 0 || e.originalEvent.shiftKey) return;
    if (typeof index !== 'number' || index === CLOSING || refs.area.current) return;
    const segment = refs.segments.current[index];
    if (segment?.snap !== 'freehand') return;
    // A point or a handle over the line is held by its own drag.
    const over = map.queryRenderedFeatures(e.point, { layers: [POINT_LAYER, HANDLE_DOT_LAYER] });
    if (over.length > 0) return;
    const from: LngLat = [e.lngLat.lng, e.lngLat.lat];
    held = {
      index,
      grabbed: segment,
      t: grabAt(segment, from),
      from,
      x: e.point.x,
      y: e.point.y,
      isDragging: false,
    };
    map.dragPan.disable();
    map.on('mousemove', onMove);
    // Let go over the toolbar, the drag still ends.
    document.addEventListener('mouseup', onUp);
  };

  /** Everything a bend listens to, on; and the function that turns it all off. */
  const attach = () => {
    map.on('mousedown', HIT_LAYER, onLineDown);
    return () => {
      map.off('mousedown', HIT_LAYER, onLineDown);
      map.off('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      held = null;
    };
  };

  return { attach };
}

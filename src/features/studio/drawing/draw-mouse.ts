import type { MapMouseEvent } from 'maplibre-gl';

import type { LngLat } from '@/shared/utils/geo';

import type { DrawContext, IndexedFeature } from './draw-context';
import { gapsAround, modesAround, rubberBand } from './draw-gestures';

/**
 * The drawing's mouse drag and cursors: a drag moves a point, its two
 * stretches rubber-banding, then re-routing on release; the cursor is a hand
 * over a point, a copy over the line, a crosshair elsewhere. `dragTo` and
 * `settleDrag` are a finger's drag too (touchHandlers).
 */
export function mouseHandlers(ctx: DrawContext) {
  const { map, canvas, refs, drag } = ctx;
  const { resolveGaps, writePoints, writeSegments, markStandIn } = ctx.actions;

  /** The point being dragged follows the pointer; its two stretches rubber-band. */
  const dragTo = (point: LngLat) => {
    const i = drag.idx;
    if (i === null) return;
    drag.moved = true;
    // Rubber-band the two neighbours while dragging; they re-route on release.
    const moved = rubberBand(
      refs.points.current,
      refs.segments.current,
      i,
      point,
      drag.modes,
      refs.join.current,
    );
    refs.join.current = moved.join;
    writePoints(moved.points);
    for (const s of moved.standIns) markStandIn(s);
    writeSegments(moved.segments);
  };

  const onDragMove = (e: MapMouseEvent) => dragTo([e.lngLat.lng, e.lngLat.lat]);

  /** A drag let go, by mouse or finger: point `i` has moved, or not. */
  const settleDrag = (i: number | null) => {
    // A press and release that never moved is not an edit: both segments are
    // still right, so the router is not asked again.
    if (i === null || !drag.moved) return;
    // Only the two segments touching the moved point are stale, and they go
    // to the router together, as one request.
    const gaps = gapsAround(i, refs.points.current.length - 1, drag.modes);
    if (gaps) void resolveGaps(gaps.from, gaps.modes);
  };

  const onDragEnd = () => {
    const i = drag.idx;
    drag.idx = null;
    map.off('mousemove', onDragMove);
    map.off('mouseup', onDragEnd);
    document.removeEventListener('mouseup', onDragEnd);
    canvas.style.cursor = 'crosshair';
    map.dragPan.enable();
    settleDrag(i);
  };

  const onPointDown = (e: MapMouseEvent & { features?: IndexedFeature[] }) => {
    const idx = e.features?.[0]?.properties?.index;
    if (typeof idx !== 'number') return;
    // Left button only. A right-click must reach the contextmenu handler;
    // starting a drag here would swallow it.
    if (e.originalEvent.button !== 0) return;
    e.preventDefault();
    drag.idx = idx;
    drag.moved = false;
    drag.modes = modesAround(refs.segments.current, idx);
    canvas.style.cursor = 'grabbing';
    map.dragPan.disable();
    map.on('mousemove', onDragMove);
    map.once('mouseup', onDragEnd);
    // MapLibre reports mouseup only over the map. Released over the toolbar,
    // the drag would never end and its stand-ins would stay.
    document.addEventListener('mouseup', onDragEnd);
  };

  const enterPoint = () => {
    if (drag.idx === null) canvas.style.cursor = 'grab';
  };
  const enterLine = () => {
    if (drag.idx === null) canvas.style.cursor = 'copy';
  };
  const leave = () => {
    if (drag.idx === null) canvas.style.cursor = 'crosshair';
  };

  return { dragTo, settleDrag, onDragMove, onDragEnd, onPointDown, enterPoint, enterLine, leave };
}

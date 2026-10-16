import type { MapLibreMap } from 'maplibre-gl';
import { useEffect } from 'react';

import { clickHandlers } from './draw-clicks';
import type { DrawActions, DrawContext, DrawRefs } from './draw-context';
import { HIT_LAYER, POINT_LAYER } from './draw-layers';
import { mouseHandlers } from './draw-mouse';
import { touchHandlers } from './draw-touch';

/**
 * The drawing's pointer, while drawing: a click on the map adds a point, on
 * the line inserts one, a right-click deletes a point or asks to follow a
 * saved line (draw-clicks.ts); a mouse drags a point (draw-mouse.ts); a
 * finger does the same through touch events, and a tap or a long-press on or
 * beside a point selects it for the point bar (draw-touch.ts). The
 * arithmetic they share is draw-gestures.ts.
 *
 * The handlers are bound once per drawing and read the drawing through its
 * refs, which every mutator keeps current. They share one context, `ctx`:
 * a mouse drag and a finger drag are one drag, settled the same way.
 */
export function useDrawEvents(
  map: MapLibreMap | null,
  drawing: boolean,
  refs: DrawRefs,
  actions: DrawActions,
): void {
  // Listed one by one below, never as `actions`: the caller builds that object
  // afresh each render, and the handlers must not be bound again mid-drag.
  const {
    setPicking,
    addPoint,
    insertPoint,
    deletePoint,
    toggleSegment,
    resolveGaps,
    writePoints,
    writeSegments,
    markStandIn,
    isStandIn,
    select,
    setFollowOffer,
  } = actions;
  useEffect(() => {
    if (!map || !drawing) return;
    if (!map.getLayer(POINT_LAYER) || !map.getLayer(HIT_LAYER)) return;

    const canvas = map.getCanvas();
    canvas.style.cursor = 'crosshair';
    // A finger held on the map is a long-press, not a call for iOS's callout.
    canvas.style.setProperty('-webkit-touch-callout', 'none');

    // Shift+drag is MapLibre's box zoom and it swallows shift+click, which is
    // our "straighten this segment" gesture. Double-click zoom would fire on a
    // quick pair of route clicks. Neither belongs in drawing mode.
    map.boxZoom.disable();
    map.doubleClickZoom.disable();

    const ctx: DrawContext = {
      map,
      canvas,
      refs,
      actions: {
        setPicking,
        addPoint,
        insertPoint,
        deletePoint,
        toggleSegment,
        resolveGaps,
        writePoints,
        writeSegments,
        markStandIn,
        isStandIn,
        select,
        setFollowOffer,
      },
      drag: { idx: null, moved: false, modes: [undefined, undefined] },
      echo: { until: -Infinity, lastTouchEnd: -Infinity },
    };
    const { onMapClick, onLineClick, onPointContext, onMapContext } = clickHandlers(ctx);
    const mouse = mouseHandlers(ctx);
    const { onDragMove, onDragEnd, onPointDown, enterPoint, enterLine, leave } = mouse;
    const { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, clearTimer } = touchHandlers(
      ctx,
      mouse,
    );

    // The line's handler first: MapLibre calls click listeners in the order
    // they were added, and a tap on the line that closes the point bar must
    // close it there, before onMapClick has cleared the selection it reads.
    map.on('click', HIT_LAYER, onLineClick);
    map.on('click', onMapClick);
    map.on('mousedown', POINT_LAYER, onPointDown);
    map.on('contextmenu', POINT_LAYER, onPointContext);
    map.on('contextmenu', onMapContext);
    map.on('touchstart', onTouchStart);
    map.on('touchmove', onTouchMove);
    map.on('touchend', onTouchEnd);
    map.on('touchcancel', onTouchCancel);
    map.on('mouseenter', POINT_LAYER, enterPoint);
    map.on('mouseleave', POINT_LAYER, leave);
    map.on('mouseenter', HIT_LAYER, enterLine);
    map.on('mouseleave', HIT_LAYER, leave);

    return () => {
      map.off('click', onMapClick);
      map.off('click', HIT_LAYER, onLineClick);
      map.off('mousedown', POINT_LAYER, onPointDown);
      map.off('contextmenu', POINT_LAYER, onPointContext);
      map.off('contextmenu', onMapContext);
      map.off('touchstart', onTouchStart);
      map.off('touchmove', onTouchMove);
      map.off('touchend', onTouchEnd);
      map.off('touchcancel', onTouchCancel);
      clearTimer();
      map.off('mouseenter', POINT_LAYER, enterPoint);
      map.off('mouseleave', POINT_LAYER, leave);
      map.off('mouseenter', HIT_LAYER, enterLine);
      map.off('mouseleave', HIT_LAYER, leave);
      map.off('mousemove', onDragMove);
      map.off('mouseup', onDragEnd);
      document.removeEventListener('mouseup', onDragEnd);
      map.dragPan.enable();
      map.boxZoom.enable();
      map.doubleClickZoom.enable();
      canvas.style.cursor = '';
      canvas.style.removeProperty('-webkit-touch-callout');
    };
  }, [
    map,
    drawing,
    refs,
    setPicking,
    addPoint,
    insertPoint,
    deletePoint,
    toggleSegment,
    resolveGaps,
    writePoints,
    writeSegments,
    markStandIn,
    isStandIn,
    select,
    setFollowOffer,
  ]);
}

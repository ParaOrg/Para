import type { MapLayerMouseEvent, MapMouseEvent } from 'maplibre-gl';

import { moveHandle, toggleSmooth, type HandleRef } from './curve-handles';
import type { DrawContext } from './draw-context';

/**
 * A curve shaped after it is drawn, the way a pen tool's editor does: a
 * handle's dot dragged bends its stretch, the handle across its point turning
 * to mirror it, or not while Alt is held; a point double-clicked switches
 * between corner and smooth. Only Draw's stretches bend (curve-handles.ts). A
 * mouse's: a finger has the point bar.
 */

/** The click that ends a handle's drag comes straight after it, and adds no point. */
const CLICK_AFTER_MS = 50;

export function handleDragHandlers(ctx: DrawContext) {
  const { map, canvas, refs } = ctx;
  const { writeSegments } = ctx.actions;
  let held: HandleRef | null = null;

  const onMove = (e: MapMouseEvent) => {
    if (!held) return;
    const to: [number, number] = [e.lngLat.lng, e.lngLat.lat];
    writeSegments(moveHandle(refs.segments.current, held, to, e.originalEvent.altKey));
  };

  const onUp = () => {
    map.off('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    map.dragPan.enable();
    canvas.style.cursor = 'crosshair';
    if (held) ctx.echo.until = performance.now() + CLICK_AFTER_MS;
    held = null;
  };

  const onHandleDown = (e: MapLayerMouseEvent) => {
    const props = e.features?.[0]?.properties;
    const seg = props?.seg;
    const end = props?.end;
    if (e.originalEvent.button !== 0 || typeof seg !== 'number' || seg < 0) return;
    if (end !== 0 && end !== 1) return;
    e.preventDefault();
    held = { seg, end };
    map.dragPan.disable();
    canvas.style.cursor = 'grabbing';
    map.on('mousemove', onMove);
    // Let go over the toolbar, the drag still ends.
    document.addEventListener('mouseup', onUp);
  };

  const onPointDoubleClick = (e: MapLayerMouseEvent) => {
    const idx = e.features?.[0]?.properties?.index;
    if (typeof idx !== 'number' || refs.area.current) return;
    e.preventDefault();
    writeSegments(toggleSmooth(refs.segments.current, refs.points.current, idx));
  };

  const enterHandle = () => {
    if (!held && ctx.drag.idx === null) canvas.style.cursor = 'move';
  };
  const leaveHandle = () => {
    if (!held && ctx.drag.idx === null) canvas.style.cursor = 'crosshair';
  };

  /** Everything a handle's drag listens to, on; and the function that turns it all off. */
  const attach = (handleLayer: string, pointLayer: string) => {
    map.on('mousedown', handleLayer, onHandleDown);
    map.on('mouseenter', handleLayer, enterHandle);
    map.on('mouseleave', handleLayer, leaveHandle);
    map.on('dblclick', pointLayer, onPointDoubleClick);
    return () => {
      map.off('mousedown', handleLayer, onHandleDown);
      map.off('mouseenter', handleLayer, enterHandle);
      map.off('mouseleave', handleLayer, leaveHandle);
      map.off('dblclick', pointLayer, onPointDoubleClick);
      map.off('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      held = null;
    };
  };

  return { attach };
}

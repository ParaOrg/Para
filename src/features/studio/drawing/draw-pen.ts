import type { MapMouseEvent } from 'maplibre-gl';

import type { LngLat } from '@/shared/utils/geo';

import { mirror, penStretch } from './curves';
import { CLICK_AFTER_MS, DRAG_PX, type DrawContext } from './draw-context';
import { handleLines, lineFeatures } from './draw-features';
import {
  HANDLE_DOT_LAYER,
  HANDLE_SRC,
  HIT_LAYER,
  LINE_SRC,
  POINT_LAYER,
  isGeoJSON,
} from './draw-layers';
import { isTyping } from './toolbar-text';
import { isNearClose, closeTargetOf } from './use-connect-hint';

/**
 * Draw's pen: a press on empty map and a drag places a smooth point where the
 * press was, its handles mirrored, the drag pulling the one toward the next
 * stretch, as a pen tool does. A press let go without a drag is a click, and
 * places a corner (draw-clicks.ts). While the drag pulls, the stretch in
 * bends live under the pointer, as the release will write it. In Draw a drag on empty map
 * therefore shapes a curve rather than panning: hold Space to pan, as in a
 * pen tool, or pan in Snap. A mouse's: a finger places corners.
 */

export function penHandlers(ctx: DrawContext) {
  const { map, canvas, refs } = ctx;
  const { addSmoothPoint } = ctx.actions;
  /** The press: where on the map, where on the page, and the handle the drag has pulled. */
  let press: {
    at: LngLat;
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    out: LngLat | null;
  } | null = null;

  /** The point being placed and its two handles, the only ones shown while the drag shapes them. */
  const showHandles = (at: LngLat, out: LngLat) => {
    const src = map.getSource(HANDLE_SRC);
    if (isGeoJSON(src)) src.setData(handleLines([{ point: at, handles: [mirror(out, at), out] }]));
  };

  /**
   * The stretch into the point being placed, bent as the release will write
   * it (addSmoothPoint), shown on the line with the stretches already drawn.
   * Only the map's source: the drawing itself changes on release, and its
   * next render writes the line afresh.
   */
  const showStretch = (at: LngLat, out: LngLat) => {
    const src = map.getSource(LINE_SRC);
    if (!isGeoJSON(src)) return;
    const points = refs.points.current;
    const join = refs.join.current;
    const hasJoin = !!join && points.includes(join);
    const stretch = penStretch(
      points,
      refs.segments.current,
      hasJoin,
      refs.pendingOut.current,
      at,
      mirror(out, at),
    );
    if (!stretch) return;
    src.setData(lineFeatures([...refs.segments.current, stretch], points, refs.area.current));
  };

  const onMove = (e: MapMouseEvent) => {
    if (!press) return;
    if (!press.out && Math.hypot(e.point.x - press.x, e.point.y - press.y) < DRAG_PX) return;
    press.out = [e.lngLat.lng, e.lngLat.lat];
    showHandles(press.at, press.out);
    showStretch(press.at, press.out);
  };

  const onUp = (e: MouseEvent) => {
    map.off('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    map.dragPan.enable();
    const placed = press;
    press = null;
    // A press that never dragged is a click: the click handler places it.
    if (!placed?.out) return;
    if (Math.hypot(e.clientX - placed.clientX, e.clientY - placed.clientY) < DRAG_PX)
      ctx.echo.until = performance.now() + CLICK_AFTER_MS;
    void addSmoothPoint(placed.at, placed.out);
  };

  const onDown = (e: MapMouseEvent) => {
    if (e.originalEvent.button !== 0 || ctx.pan.isSpaceHeld) return;
    if (!refs.freehand.current || refs.area.current || refs.picking.current) return;
    // A point is dragged, the line inserted into, the first point clicked to close.
    const under = [POINT_LAYER, HIT_LAYER, HANDLE_DOT_LAYER];
    if (map.queryRenderedFeatures(e.point, { layers: under }).length > 0) return;
    const closeAt = closeTargetOf(map);
    if (closeAt && isNearClose(map, e.point, closeAt)) return;
    press = {
      at: [e.lngLat.lng, e.lngLat.lat],
      x: e.point.x,
      y: e.point.y,
      clientX: e.originalEvent.clientX,
      clientY: e.originalEvent.clientY,
      out: null,
    };
    map.dragPan.disable();
    map.on('mousemove', onMove);
    // Let go over the toolbar, the press still ends.
    document.addEventListener('mouseup', onUp);
  };

  // Space held pans, unless it is typed into a field or presses a control;
  // let go, or the window left, and the pen is back.
  const release = () => {
    if (!ctx.pan.isSpaceHeld) return;
    ctx.pan.isSpaceHeld = false;
    if (canvas.style.cursor === 'grab' && ctx.drag.idx === null) canvas.style.cursor = 'crosshair';
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || isTyping(e.target)) return;
    // Space on a focused control presses it, as a keyboard expects.
    if (e.target instanceof Element && e.target.closest('button, a, [role="button"]')) return;
    // Not a scroll of the page under the map.
    e.preventDefault();
    if (ctx.pan.isSpaceHeld) return;
    ctx.pan.isSpaceHeld = true;
    if (ctx.drag.idx === null) canvas.style.cursor = 'grab';
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'Space') release();
  };

  /** Everything the pen listens to, on; and the function that turns it all off. */
  const attach = () => {
    map.on('mousedown', onDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('blur', release);
      map.off('mousedown', onDown);
      map.off('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      press = null;
    };
  };

  return { attach };
}

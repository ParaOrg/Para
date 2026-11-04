import type { MapMouseEvent } from 'maplibre-gl';

import type { LngLat } from '@/shared/utils/geo';

import { mirror } from './curves';
import type { DrawContext } from './draw-context';
import { handleFeatures, handleLines } from './draw-features';
import { HANDLE_SRC, HIT_LAYER, POINT_LAYER, isGeoJSON } from './draw-layers';
import { isTyping } from './toolbar-text';
import { isNearClose, closeTargetOf } from './use-connect-hint';

/**
 * Draw's pen: a press on empty map and a drag places a smooth point where the
 * press was, its handles mirrored, the drag pulling the one toward the next
 * stretch, as a pen tool does. A press let go without a drag is a click, and
 * places a corner (draw-clicks.ts). In Draw a drag on empty map
 * therefore shapes a curve rather than panning: hold Space to pan, as in a
 * pen tool, or pan in Snap. A mouse's: a finger places corners.
 */

/** A press that moves this far is a drag: MapLibre's own click tolerance. */
const DRAG_PX = 3;

/**
 * A drag let go back within DRAG_PX of its press still ends in a click, which
 * comes straight after the release: one this soon is the drag's, not a corner.
 */
const CLICK_AFTER_MS = 50;

export function penHandlers(ctx: DrawContext) {
  const { map, canvas, refs } = ctx;
  const { addSmoothPoint } = ctx.actions;
  let isSpaceDown = false;
  /** The press: where on the map, where on the page, and the handle the drag has pulled. */
  let press: {
    at: LngLat;
    x: number;
    y: number;
    clientX: number;
    clientY: number;
    out: LngLat | null;
  } | null = null;

  /** The point being placed and its two handles, shown with every curve's own while the drag shapes them. */
  const showHandles = (at: LngLat, out: LngLat) => {
    const src = map.getSource(HANDLE_SRC);
    if (!isGeoJSON(src)) return;
    const placing = handleLines([{ point: at, handles: [mirror(out, at), out] }]);
    const drawn = handleFeatures(refs.segments.current, refs.area.current);
    src.setData({ type: 'FeatureCollection', features: [...drawn.features, ...placing.features] });
  };

  const onMove = (e: MapMouseEvent) => {
    if (!press) return;
    if (!press.out && Math.hypot(e.point.x - press.x, e.point.y - press.y) < DRAG_PX) return;
    press.out = [e.lngLat.lng, e.lngLat.lat];
    showHandles(press.at, press.out);
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
    if (e.originalEvent.button !== 0 || isSpaceDown) return;
    if (!refs.freehand.current || refs.area.current || refs.picking.current) return;
    // A point is dragged, the line inserted into, the first point clicked to close.
    if (map.queryRenderedFeatures(e.point, { layers: [POINT_LAYER, HIT_LAYER] }).length > 0) return;
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
    if (!isSpaceDown) return;
    isSpaceDown = false;
    if (canvas.style.cursor === 'grab' && ctx.drag.idx === null) canvas.style.cursor = 'crosshair';
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || isTyping(e.target)) return;
    // Space on a focused control presses it, as a keyboard expects.
    if (e.target instanceof Element && e.target.closest('button, a, [role="button"]')) return;
    // Not a scroll of the page under the map.
    e.preventDefault();
    if (isSpaceDown) return;
    isSpaceDown = true;
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

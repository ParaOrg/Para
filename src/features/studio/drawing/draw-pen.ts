import type { MapMouseEvent } from 'maplibre-gl';

import type { LngLat } from '@/shared/utils/geo';

import { mirror } from './curves';
import type { DrawContext } from './draw-context';
import { handleLines } from './draw-features';
import { HANDLE_SRC, HIT_LAYER, POINT_LAYER, isGeoJSON } from './draw-layers';
import { isNearClose, closeTargetOf } from './use-connect-hint';

/**
 * Draw's pen: a press on empty map and a drag places a smooth point where the
 * press was, its handles mirrored, the drag pulling the one toward the next
 * stretch, as a pen tool does. A press let go without a drag is a click, and
 * places a corner (draw-clicks.ts). In Draw a drag on empty map
 * therefore shapes a curve rather than panning: hold Space to pan, as in a
 * pen tool, or pan in Snap. A mouse's: a finger places corners.
 */

/** A press must move this far before it is a drag: MapLibre's own click tolerance and a pixel. */
const DRAG_PX = 4;

export function penHandlers(ctx: DrawContext) {
  const { map, canvas, refs } = ctx;
  const { addSmoothPoint } = ctx.actions;
  let isSpaceDown = false;
  let press: { at: LngLat; x: number; y: number; out: LngLat | null } | null = null;

  /** The point being placed and its two handles, shown while the drag shapes them. */
  const showHandles = (at: LngLat, out: LngLat | null) => {
    const src = map.getSource(HANDLE_SRC);
    if (isGeoJSON(src))
      src.setData(handleLines(out ? [{ point: at, handles: [mirror(out, at), out] }] : []));
  };

  const onMove = (e: MapMouseEvent) => {
    if (!press) return;
    if (!press.out && Math.hypot(e.point.x - press.x, e.point.y - press.y) < DRAG_PX) return;
    press.out = [e.lngLat.lng, e.lngLat.lat];
    showHandles(press.at, press.out);
  };

  const onUp = () => {
    map.off('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    map.dragPan.enable();
    const placed = press;
    press = null;
    // A press that never dragged is a click: the click handler places it.
    if (placed?.out) void addSmoothPoint(placed.at, placed.out);
  };

  const onDown = (e: MapMouseEvent) => {
    if (e.originalEvent.button !== 0 || isSpaceDown) return;
    if (!refs.freehand.current || refs.area.current || refs.picking.current) return;
    // A point is dragged, the line inserted into, the first point clicked to close.
    if (map.queryRenderedFeatures(e.point, { layers: [POINT_LAYER, HIT_LAYER] }).length > 0) return;
    const closeAt = closeTargetOf(map);
    if (closeAt && isNearClose(map, e.point, closeAt)) return;
    press = { at: [e.lngLat.lng, e.lngLat.lat], x: e.point.x, y: e.point.y, out: null };
    map.dragPan.disable();
    map.on('mousemove', onMove);
    // Let go over the toolbar, the press still ends.
    document.addEventListener('mouseup', onUp);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code !== 'Space' || isSpaceDown) return;
    isSpaceDown = true;
    canvas.style.cursor = 'grab';
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code !== 'Space') return;
    isSpaceDown = false;
    canvas.style.cursor = 'crosshair';
  };

  /** Everything the pen listens to, on; and the function that turns it all off. */
  const attach = () => {
    map.on('mousedown', onDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
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

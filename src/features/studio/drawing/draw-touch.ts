import type { MapTouchEvent } from 'maplibre-gl';

import type { LngLat, Segment } from '@/shared/utils/geo';

import { ECHO_MS, type DrawContext } from './draw-context';
import { modesAround, nearestWithin, waitingGapsAround } from './draw-gestures';

/**
 * A finger within this many pixels of one of the drawing's points is on that
 * point, the nearest one winning. A dot is 6 px across its middle; a finger is
 * not, and a tap just beside a dot was inserting a second point on the line
 * under it.
 */
const FINGER_PX = 20;
/** A finger on a point drags it once it has moved this far: less is a tap. */
const DRAG_START_PX = 6;
/** A finger held this long without moving is a long-press, which adds nothing. */
const LONG_PRESS_MS = 500;

/**
 * The drawing by finger: a drag from a point moves it, and a second finger
 * puts it back and pinches instead. A tap or a long-press on or beside a
 * point selects it, for the point bar's Delete and stretch buttons. A drag
 * moves and settles as the mouse's does (`mouse`, mouseHandlers').
 */
export function touchHandlers(
  ctx: DrawContext,
  mouse: { dragTo: (point: LngLat) => void; settleDrag: (i: number | null) => void },
) {
  const { map, refs, drag, echo } = ctx;
  const { resolveGaps, writePoints, writeSegments, isStandIn, select, setFollowOffer } =
    ctx.actions;
  const { dragTo, settleDrag } = mouse;

  // The finger on the map, if one is: where it went down, the point it is
  // on, and whether it has been held long. `before` is the drawing as it
  // was, kept while its point is dragged so that a second finger can put it
  // back.
  let touch: {
    start: { x: number; y: number };
    idx: number | null;
    long: boolean;
    timer: ReturnType<typeof setTimeout>;
    before: { points: LngLat[]; segments: Segment[]; join: LngLat | null } | null;
  } | null = null;

  /** The drawing's point nearest a finger at `p`, if one is within reach. */
  const pointUnderFinger = (p: { x: number; y: number }): number | null =>
    nearestWithin(
      refs.points.current.map((c) => map.project(c)),
      p,
      FINGER_PX,
    );

  /**
   * The fingers on the map, in its pixels. A touch event lists every finger
   * on the screen, and MapLibre's points and centre count them all, so a
   * thumb resting on the toolbar would turn one finger on a point into a
   * pinch, and its lifting would never end the drag.
   */
  const container = map.getCanvasContainer();
  const fingersOnMap = (e: TouchEvent) => {
    const r = container.getBoundingClientRect();
    return [...e.touches]
      .filter((f) => container.contains(f.target as Node))
      .map((f) => ({ x: f.clientX - r.left, y: f.clientY - r.top }));
  };

  // A finger on a point holds the map still, so that a drag moves the point
  // rather than panning; anywhere else the map pans and pinches as ever.
  const onTouchStart = (e: MapTouchEvent) => {
    // A new touch: whatever click the last one was owed has come by now.
    echo.until = -Infinity;
    const fingers = fingersOnMap(e.originalEvent);
    if (touch) {
      putBack();
      if (fingers.length > 1) return;
    }
    const one = fingers.length === 1 ? fingers[0] : null;
    const idx = refs.picking.current || !one ? null : pointUnderFinger(one);
    const timer = setTimeout(() => {
      if (touch) touch.long = true;
    }, LONG_PRESS_MS);
    touch = { start: one ?? e.point, idx, long: false, timer, before: null };
    if (idx !== null) map.dragPan.disable();
  };

  const onTouchMove = (e: MapTouchEvent) => {
    const t = touch;
    const fingers = fingersOnMap(e.originalEvent);
    if (!t || fingers.length !== 1) return;
    const p = fingers[0];
    if (Math.hypot(p.x - t.start.x, p.y - t.start.y) < DRAG_START_PX && drag.idx === null) return;
    clearTimeout(t.timer);
    if (t.idx === null) return;
    if (drag.idx === null) {
      drag.idx = t.idx;
      drag.moved = false;
      drag.modes = modesAround(refs.segments.current, t.idx);
      t.before = {
        points: refs.points.current,
        segments: refs.segments.current,
        join: refs.join.current,
      };
    }
    const at = map.unproject([p.x, p.y]);
    dragTo([at.lng, at.lat]);
  };

  // A second finger, or a touch the browser cancelled: the point being
  // dragged goes back where it was and the map is free again, to pinch.
  // Nothing this touch did is kept.
  const putBack = () => {
    const t = touch;
    if (!t) return;
    clearTimeout(t.timer);
    const i = drag.idx;
    if (i !== null && t.before) {
      refs.join.current = t.before.join;
      writePoints(t.before.points);
      writeSegments(t.before.segments);
      // A stretch beside the point that was still waiting for the router
      // lost its request when the drag replaced it: ask again.
      const gaps = waitingGapsAround(t.before.segments[i - 1], t.before.segments[i], i, isStandIn);
      if (gaps) void resolveGaps(gaps.from, gaps.modes);
    }
    drag.idx = null;
    if (t.idx !== null) map.dragPan.enable();
    t.idx = null;
  };

  const onTouchCancel = () => {
    putBack();
    touch = null;
  };

  const onTouchEnd = (e: MapTouchEvent) => {
    // One finger of two lifted: the gesture is not over.
    if (fingersOnMap(e.originalEvent).length > 0) return;
    const t = touch;
    touch = null;
    echo.lastTouchEnd = performance.now();
    if (!t) return;
    clearTimeout(t.timer);
    // A press on a point and a long-press are answered here; the click the
    // browser sends after them must not add a point as well. (A finger that
    // moved past the browser's slop panned the map, and gets no click.)
    if (t.idx !== null || t.long) echo.until = performance.now() + ECHO_MS;
    if (t.idx === null) return;
    const i = drag.idx;
    drag.idx = null;
    map.dragPan.enable();
    if (i === null) {
      setFollowOffer(null);
      select(t.idx);
    } else settleDrag(i);
  };

  /** The long-press timer of a finger still down, cleared as the drawing ends. */
  const clearTimer = () => {
    if (touch) clearTimeout(touch.timer);
  };

  return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel, clearTimer };
}

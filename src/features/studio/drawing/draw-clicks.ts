import type { MapMouseEvent } from 'maplibre-gl';

import { ROUTES_HIT_LAYER, tapBox } from '@/features/routes/map/tap';
import type { LngLat } from '@/shared/utils/geo';

import { nearestSpot } from './borrow';
import { fromFinger, isEcho, type DrawContext, type IndexedFeature } from './draw-context';
import { featureIds } from './draw-gestures';
import { CLOSING, HIT_LAYER, POINT_LAYER } from './draw-layers';

/** A tap this many pixels off the line being extended does not pick a spot on it. */
const PICK_PX = 40;

/**
 * The drawing's clicks and right-clicks: a click on the map adds a point, on
 * the line inserts one (shift: straightens that stretch); a right-click on a
 * point deletes it and on a saved line asks to follow it; while picking where
 * an Extend leaves a line, a tap near it picks the spot. A tap that adds a
 * point on a saved line offers to follow that line instead, which is the
 * right-click's job on a desktop; the next tap on the map with the point bar
 * open only closes it.
 */
export function clickHandlers(ctx: DrawContext) {
  const { map, refs } = ctx;
  const { setPicking, addPoint, insertPoint, deletePoint, toggleSegment, select, setFollowOffer } =
    ctx.actions;

  /**
   * A tap while the point bar is open closes it and does nothing else, so
   * that tapping the map to put the bar away never adds a point.
   */
  const closesBar = () => {
    setFollowOffer(null);
    if (refs.selected.current === null) return false;
    select(null);
    return true;
  };

  /**
   * After a finger adds a point on a saved line, while drawing a route that
   * has a point before it and follows no line yet: offer to follow that one.
   */
  const offerFollow = (e: MapMouseEvent, point: LngLat) => {
    if (!fromFinger(ctx) || refs.area.current || refs.join.current || refs.borrow.current) return;
    if (refs.points.current.length < 2 || !map.getLayer(ROUTES_HIT_LAYER)) return;
    const ids = featureIds(
      map.queryRenderedFeatures(tapBox(e.point, e.originalEvent), { layers: [ROUTES_HIT_LAYER] }),
    );
    if (ids.length > 0) setFollowOffer({ ids, at: point, point });
  };

  // Clicking empty map appends a point; clicking the route itself does not.
  const onMapClick = (e: MapMouseEvent) => {
    if (isEcho(ctx) || closesBar()) return;
    // Choosing where a new route leaves a saved one: a tap near its line
    // picks the nearest spot on it; a tap elsewhere is ignored.
    const p = refs.picking.current;
    if (p) {
      const spot = nearestSpot(p.direction.segments ?? [], [e.lngLat.lng, e.lngLat.lat]);
      if (!spot) return;
      const px = map.project(spot.point);
      if (Math.hypot(px.x - e.point.x, px.y - e.point.y) > PICK_PX) return;
      const next = { direction: p.direction, spot };
      refs.picking.current = next;
      setPicking(next);
      return;
    }
    const hits = map.queryRenderedFeatures(e.point, {
      layers: [POINT_LAYER, HIT_LAYER],
    });
    if (hits.length > 0) return;
    const point: LngLat = [e.lngLat.lng, e.lngLat.lat];
    void addPoint(point);
    offerFollow(e, point);
  };

  const onLineClick = (e: MapMouseEvent & { features?: IndexedFeature[] }) => {
    if (isEcho(ctx) || closesBar()) return;
    // A click on a point's dot is a press on that point, not a click on the
    // line beneath it: inserting here would stack a second point on the first.
    if (map.queryRenderedFeatures(e.point, { layers: [POINT_LAYER] }).length > 0) return;
    const gap = e.features?.[0]?.properties?.index;
    if (typeof gap !== 'number') return;
    // Clicking the closing edge of a hotspot appends a corner: the ring
    // re-closes through the new point, which is what "insert here" means
    // on that edge. Nothing to straighten — area edges are already straight.
    if (gap === CLOSING) {
      if (!e.originalEvent.shiftKey) void addPoint([e.lngLat.lng, e.lngLat.lat]);
      return;
    }
    if (e.originalEvent.shiftKey) {
      if (!refs.area.current) void toggleSegment(gap);
    } else void insertPoint(gap, [e.lngLat.lng, e.lngLat.lat]);
  };

  const onPointContext = (e: MapMouseEvent & { features?: IndexedFeature[] }) => {
    e.preventDefault();
    const idx = e.features?.[0]?.properties?.index;
    if (typeof idx === 'number') void deletePoint(idx);
  };

  // A right-click on a saved line — not on one of the drawing's points,
  // which deletes it — asks to join that line and follow it to its end.
  const onMapContext = (e: MapMouseEvent) => {
    if (refs.area.current || refs.picking.current || !refs.follow.current) return;
    if (!map.getLayer(ROUTES_HIT_LAYER)) return;
    if (map.queryRenderedFeatures(e.point, { layers: [POINT_LAYER] }).length > 0) return;
    const ids = featureIds(map.queryRenderedFeatures(e.point, { layers: [ROUTES_HIT_LAYER] }));
    if (ids.length === 0) return;
    e.preventDefault();
    refs.follow.current(ids, [e.lngLat.lng, e.lngLat.lat]);
  };

  return { onMapClick, onLineClick, onPointContext, onMapContext };
}

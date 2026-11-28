import type { Hotspot } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { otherWayName } from './direction-tabs';
import { outboundFor, returnTripNotices } from '../drawing/loop-closing';
import { runsSameWay } from '../drawing/same-way';

/**
 * The save panel's notes on a line drawn into a route's empty slot: how far each end is from the
 * other way's, that way named as its tab is. None without a route, or for an edit.
 */
export function returnTripNotes(
  directions: readonly DirectionRow[],
  routeId: string | null,
  hotspots: readonly Hotspot[],
  drawn: readonly LngLat[],
): string[] {
  if (!routeId) return [];
  return returnTripNotices(directions, routeId, hotspots, drawn, otherWayName(directions, routeId));
}

/**
 * What the Playground says when a line picked for a route's empty slot plainly runs the same way
 * as the route's drawn direction; null when it does not, or there is nothing to compare.
 */
export function sameWayNotice(
  directions: readonly DirectionRow[],
  routeId: string,
  hotspots: readonly Hotspot[],
  line: readonly LngLat[],
): string | null {
  const drawn = outboundFor(directions, routeId, hotspots);
  if (!drawn || !runsSameWay(line, drawn)) return null;
  return `This line runs the same way as ${otherWayName(directions, routeId)}, and the empty slot is for the other way. Check it, or redraw it from its other end, before you save.`;
}

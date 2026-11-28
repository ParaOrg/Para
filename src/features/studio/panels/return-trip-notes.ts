import type { Hotspot } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import { otherWayName } from './direction-tabs';
import { returnTripNotices } from '../drawing/loop-closing';

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

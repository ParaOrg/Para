import { haversine, type LngLat } from '@/shared/utils/geo';

import type { Hotspot } from '../model/hotspots';

/** A fix vaguer than this says nothing about which place is nearest. */
export const NEAR_MAX_ACCURACY_M = 200;
/** A commuter farther than this from every box of a loop is nowhere near it: the nearest box is no tip. */
export const NEAR_MAX_DISTANCE_M = 1000;

/** Where the commuter is, as the locator last said: a point and how sure it is, in metres. */
export interface CommuterWhere {
  at: LngLat;
  accuracyM: number;
}

/**
 * The commuter's place, if it can choose a loop's tip (timeline.ts, loopTip):
 * the fix is sharp enough and within reach of a box the loop passes. Otherwise
 * null, and the tip is the first place the loop's line passes.
 */
export function usableNear(along: readonly Hotspot[], where: CommuterWhere | null): LngLat | null {
  if (!where || where.accuracyM > NEAR_MAX_ACCURACY_M) return null;
  const isInReach = along.some(
    (s) => haversine(s.point.coordinates, where.at) <= NEAR_MAX_DISTANCE_M,
  );
  return isInReach ? where.at : null;
}

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

/** Where a loop's tip lies on the ride between the picks. */
export type TipOnRide = 'start' | 'end' | 'through' | 'outside';

/**
 * The tip's place on a ride round a loop of `whole` metres, all measured along
 * its line: the ride leaves from the start (a null start is the tip itself)
 * and goes forward to the end (a null end, with a start, is the tip again). The
 * tip is where the ride starts, where it ends, or on a wrapped ride passes
 * through it; a ride that stops short of it leaves it outside.
 */
export function tipOnRide(
  whole: number,
  tip: number,
  start: number | null,
  end: number | null,
): TipOnRide {
  if (start === null) return 'start';
  if (end === null) return 'end';
  const forward = (from: number, to: number) => (((to - from) % whole) + whole) % whole;
  const ride = forward(start, end) < 1 ? whole : forward(start, end);
  const toTip = forward(start, tip);
  if (toTip < 1) return 'start';
  if (Math.abs(toTip - ride) < 1) return 'end';
  return toTip < ride ? 'through' : 'outside';
}

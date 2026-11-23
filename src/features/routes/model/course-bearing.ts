// The direction of travel for a course-up map, from a ride's recent fixes.
import type { LngLat } from '@/shared/utils/geo';

import { distanceM, type Fix } from './ride-recording';

const toRad = (deg: number): number => (deg * Math.PI) / 180;

/**
 * A direction of travel needs the recent fixes' older and newer halves to sit
 * this far apart (their averages, not single fixes); less is the phone's
 * wander, not a heading. A jeep at 15 km/h covers about 21 m between the
 * halves, so it still gets a heading, and a crawl keeps the last one.
 */
export const BEARING_MIN_M = 20;
/**
 * The fixes that decide a heading are the ones this recent. Standing, the
 * phone drifts (HINTO_RADIUS_M allows 25 m); with no time limit the drift adds
 * up to a heading and the map turns while the contributor waits. It also stops
 * a heading being measured from before a stop.
 */
export const BEARING_WINDOW_S = 10;
/**
 * Each half needs this many fixes. One phone fix is off by 8 m or more; the
 * average of several is off by about that over their square root, so a false
 * 20 m between the halves is rare where between two single fixes it is not.
 */
const BEARING_MIN_FIXES_PER_HALF = 2;

/** The initial great-circle bearing from one point to another, in degrees clockwise from north. */
function bearingBetween([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const dLng = toRad(lng2 - lng1);
  const y = Math.sin(dLng) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** The average position of some fixes; short distances only, where lng and lat average plainly. */
function meanPosition(fixes: readonly Fix[]): LngLat {
  const sum = fixes.reduce<LngLat>((acc, fix) => [acc[0] + fix.at[0], acc[1] + fix.at[1]], [0, 0]);
  return [sum[0] / fixes.length, sum[1] / fixes.length];
}

/**
 * The direction of travel for a course-up map, in degrees clockwise from
 * north. The kept fixes within BEARING_WINDOW_S of the latest one are split by
 * time into an older and a newer half; each needs at least two fixes, and the
 * heading runs from the older half's average position to the newer half's,
 * which must sit BEARING_MIN_M apart. Anything less (standing, crawling, too
 * few fixes) gives `previous`, or null when there is none, so the map keeps the
 * heading it had. Averaging first is what stops GPS noise turning the map.
 */
export function courseBearing(fixes: readonly Fix[], previous: number | null): number | null {
  const latest = fixes[fixes.length - 1];
  if (!latest) return previous;
  const recent = fixes.filter((fix) => latest.time - fix.time <= BEARING_WINDOW_S * 1000);
  const middle = (recent[0].time + latest.time) / 2;
  const older = recent.filter((fix) => fix.time < middle);
  const newer = recent.filter((fix) => fix.time >= middle);
  if (older.length < BEARING_MIN_FIXES_PER_HALF || newer.length < BEARING_MIN_FIXES_PER_HALF) {
    return previous;
  }
  const from = meanPosition(older);
  const to = meanPosition(newer);
  return distanceM(from, to) >= BEARING_MIN_M ? bearingBetween(from, to) : previous;
}

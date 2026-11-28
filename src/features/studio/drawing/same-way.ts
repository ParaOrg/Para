import { haversine, type LngLat } from '@/shared/utils/geo';

/*
 * A line picked to fill a route's empty slot should run the other way to the route's drawn
 * direction. Pure, so tests/unit/same-way-test.mjs can hold it.
 */

/**
 * How much nearer, end to end, a line must lie to the other way's ends taken the same way round
 * than taken crossed, to be said to plainly run the same way.
 */
const SAME_WAY_RATIO = 0.5;

/** Drawn ends nearer each other than this go nearly round: no way round is plain. */
const ENDS_APART_M = 200;

/**
 * Whether `line` plainly runs the same way as `drawn` (both in travel order): its start is near
 * drawn's start and its end near drawn's end, and the two ends read clearly the one way round.
 * False when either has fewer than two points, or when it cannot be told (drawn nearly round). Ends
 * alone are compared, so a picked line running far past both of drawn's ends is not said to: a
 * missed note, never a wrong one.
 */
export function runsSameWay(line: readonly LngLat[], drawn: readonly LngLat[]): boolean {
  if (line.length < 2 || drawn.length < 2) return false;
  const [start, end] = [line[0], line[line.length - 1]];
  const [drawnStart, drawnEnd] = [drawn[0], drawn[drawn.length - 1]];
  if (haversine(drawnStart, drawnEnd) < ENDS_APART_M) return false;
  const sameWayM = haversine(start, drawnStart) + haversine(end, drawnEnd);
  const crossedM = haversine(start, drawnEnd) + haversine(end, drawnStart);
  return sameWayM < crossedM * SAME_WAY_RATIO;
}

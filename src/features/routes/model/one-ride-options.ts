import { haversine, lineLength, metresAlong, type LngLat } from '@/shared/utils/geo';

import type { Hotspot } from './hotspots';

/**
 * Go here's one-ride options (.scratch/go-here, ticket 01): every direction that passes a hotspot
 * within walking reach of where the commuter is and, later along the same direction, one within
 * reach of the place, ranked by least walking. Straight-line walks (honest walking, 116); the
 * owner's answer to question 1 sets the reach. Computed once per chosen place, never per render:
 * the caller builds each direction's stops once a page (`DirectionStops`).
 */

/** How far a commuter walks to board or from their stop, straight-line: about 8 minutes on foot. */
export const WALK_REACH_M = 600;
/** The reach when nothing is within WALK_REACH_M, said so on the list. */
export const WIDER_REACH_M = 1000;

/** A direction as Go here reads it: its line, and its hotspots in the order the line reaches them. */
export interface DirectionStops<D> {
  direction: D;
  /** Its name, for the ranking's last tie-break. */
  name: string;
  /** Its line: the overview until the full one is read (index-schema.ts). */
  line: readonly LngLat[];
  /** Its hotspots in passing order (orderLinked). */
  stops: readonly Hotspot[];
  /** A loop: it comes round to its tip, so a stop before the boarding one is reached by riding on. */
  isLoop: boolean;
}

/** One way there on one ride: where to board, where to get off, both walks and the ride's length. */
export interface RideOption<D> {
  direction: D;
  name: string;
  board: Hotspot;
  stop: Hotspot;
  walkToBoardM: number;
  walkFromStopM: number;
  /** Along the direction's line from the boarding hotspot to the stop. */
  rideM: number;
}

const totalWalk = (option: RideOption<unknown>): number =>
  option.walkToBoardM + option.walkFromStopM;

/** Least total walk first, then the shorter ride, then by name. */
export function byLeastWalking<D>(a: RideOption<D>, b: RideOption<D>): number {
  return totalWalk(a) - totalWalk(b) || a.rideM - b.rideM || a.name.localeCompare(b.name);
}

/**
 * A direction's best pair within `reachM`: the boarding hotspot and the stop after it (round the
 * tip on a loop) with the least total walk, the shorter ride on a tie; null when none.
 */
export function bestRide<D>(
  ride: DirectionStops<D>,
  start: LngLat,
  place: LngLat,
  reachM: number,
): RideOption<D> | null {
  const { stops, line, isLoop } = ride;
  const toBoard = stops.map((s) => haversine(start, s.point.coordinates));
  const fromStop = stops.map((s) => haversine(s.point.coordinates, place));
  const along = stops.map((s) => metresAlong(line, s.point.coordinates));
  const length = lineLength(line);
  let best: RideOption<D> | null = null;
  for (let b = 0; b < stops.length; b++) {
    if (toBoard[b] > reachM) continue;
    for (let s = 0; s < stops.length; s++) {
      if (s === b || fromStop[s] > reachM || (!isLoop && s < b)) continue;
      const rideM = s > b ? along[s] - along[b] : length - along[b] + along[s];
      const option: RideOption<D> = {
        direction: ride.direction,
        name: ride.name,
        board: stops[b],
        stop: stops[s],
        walkToBoardM: toBoard[b],
        walkFromStopM: fromStop[s],
        rideM: Math.max(0, rideM),
      };
      if (!best || byLeastWalking(option, best) < 0) best = option;
    }
  }
  return best;
}

/** Every direction's best ride within `reachM`, best first. */
function optionsWithin<D>(
  rides: readonly DirectionStops<D>[],
  start: LngLat,
  place: LngLat,
  reachM: number,
): RideOption<D>[] {
  return rides
    .map((ride) => bestRide(ride, start, place, reachM))
    .filter((option) => option !== null)
    .sort(byLeastWalking);
}

/**
 * The one-ride options from `start` to `place`, best first: within WALK_REACH_M, or, when none is,
 * within WIDER_REACH_M and `isWidened`, so the list can say so.
 */
export function oneRideOptions<D>(
  rides: readonly DirectionStops<D>[],
  start: LngLat,
  place: LngLat,
): { options: RideOption<D>[]; isWidened: boolean } {
  const near = optionsWithin(rides, start, place, WALK_REACH_M);
  if (near.length > 0) return { options: near, isWidened: false };
  return { options: optionsWithin(rides, start, place, WIDER_REACH_M), isWidened: true };
}

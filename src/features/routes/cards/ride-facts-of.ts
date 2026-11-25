import { TRANSPORT_MODE_LABEL } from './route-modes';
import { railBound } from '../model/rail-codes';
import type { Direction } from '../model/routes';
import { estimateTravel, type TravelEstimate } from '../model/travel-time';
import { vehicleOf } from '../model/vehicles';

/** What a trip's tiles say about its ride, besides its fare and length. */
export interface RideFacts {
  /** The Transport mode tile's words, "Jeep", "LRT Line 1". */
  transportMode: string;
  /** The whole ride's estimated minutes, for the Estimated Time Arrival tile. */
  estimate: TravelEstimate;
  /** A train's or the Carousel's bound, "Southbound", for its Direction row; undefined off a line or unknown. */
  bound?: string;
}

/**
 * A direction's ride facts over its `metres` and the `stops` it passes; null for a mode the design
 * draws no vehicle for, and the trip then shows no Transport mode or Estimated Time Arrival tile.
 */
export function rideFactsOf(direction: Direction, metres: number, stops: number): RideFacts | null {
  const vehicle = vehicleOf(direction);
  if (!vehicle) return null;
  const facts = {
    transportMode: TRANSPORT_MODE_LABEL[vehicle],
    estimate: estimateTravel(vehicle, metres, stops),
  };
  const bound = railBound(direction);
  return bound ? { ...facts, bound } : facts;
}

import { railBound } from '../model/rail-codes';
import { isLoop, LOOP_WORD, railLineOf, type Direction } from '../model/routes';
import { estimateTravel, type TravelEstimate } from '../model/travel-time';
import { vehicleOf, type Vehicle } from '../model/vehicles';

/** What a trip rides, and the word its ride pill adds after the mode, or null with none. */
export interface RidePill {
  vehicle: Vehicle;
  /** A train's bound, "Northbound", or a loop's name, "UP – Ikot". */
  detail: string | null;
  /** The ride's estimated minutes, for the time pill. */
  estimate: TravelEstimate;
}

/**
 * A direction's ride pills: what it rides, the word after the mode, and the whole ride's estimated
 * time over its `metres` and the `stops` it passes; null for a mode the design draws no vehicle for.
 */
export function ridePillOf(direction: Direction, metres: number, stops: number): RidePill | null {
  const vehicle = vehicleOf(direction);
  if (!vehicle) return null;
  const estimate = estimateTravel(vehicle, metres, stops);
  if (railLineOf(direction)) return { vehicle, detail: railBound(direction), estimate };
  if (isLoop(direction)) return { vehicle, detail: direction.name ?? LOOP_WORD, estimate };
  return { vehicle, detail: null, estimate };
}

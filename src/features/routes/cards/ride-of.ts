import { railBound } from '../model/rail-codes';
import { isLoop, LOOP_WORD, railLineOf, type Direction } from '../model/routes';
import { vehicleOf, type Vehicle } from '../model/vehicles';

/** What a trip rides, and the word its ride pill adds after the mode, or null with none. */
export interface Ride {
  vehicle: Vehicle;
  /** A train's bound, "Northbound", or a loop's name, "UP – Ikot". */
  detail: string | null;
}

/** A direction's ride for its pill; null for a mode the design draws no vehicle for. */
export function rideOf(direction: Direction): Ride | null {
  const vehicle = vehicleOf(direction);
  if (!vehicle) return null;
  if (railLineOf(direction)) return { vehicle, detail: railBound(direction) };
  if (isLoop(direction)) return { vehicle, detail: direction.name ?? LOOP_WORD };
  return { vehicle, detail: null };
}

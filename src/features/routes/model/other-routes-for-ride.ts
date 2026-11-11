import { otherRoutesFrom } from './departures';
import type { RideOption } from './one-ride-options';
import type { Direction } from './routes';

/**
 * "Other routes" for a trip opened from Go here (.scratch/go-here, ticket 03): the ride's other
 * options in their rank, so a commuter can switch without going back to the list. The trip detail's
 * TripOtherRoutes shows them as it shows any other routes; only the list's contents change.
 */

/**
 * The directions under "Other routes": the ride's other options, best first, when the trip came
 * from Go here (`options` given); otherwise the other routes out of where the trip starts, as
 * today (otherRoutesFrom).
 */
export function otherRoutesForTrip<V extends Direction>(
  all: readonly V[],
  of: V,
  options: readonly RideOption<V>[] | null,
): V[] {
  if (!options) return otherRoutesFrom(all, of);
  return options.map((option) => option.direction).filter((direction) => direction.id !== of.id);
}

/**
 * The option a picked row stands for, so its trip opens with its own picks: board at its boarding
 * hintuan, get off at its stop. Undefined when the trip didn't come from Go here.
 */
export function rideOptionFor<V extends Direction>(
  options: readonly RideOption<V>[] | null,
  direction: V,
): RideOption<V> | undefined {
  return options?.find((option) => option.direction.id === direction.id);
}

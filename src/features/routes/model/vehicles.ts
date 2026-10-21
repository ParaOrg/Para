import { isFerry, RAIL_LINES, railLineOf, type Direction } from './routes';

/**
 * What a trip rides, as its header names it: a train's line by its code, or
 * the vehicle's own word. The owner's TimelineRouteDetail variants
 * (4181:10844): Default the LRT-1, Variant2 the Jeepney, Variant3 the Bus,
 * Variant4 the E-Jeep, Variant5 the Ferry.
 */
export const VEHICLES = [...RAIL_LINES, 'Jeepney', 'E-Jeep', 'Bus', 'Ferry'] as const;
export type Vehicle = (typeof VEHICLES)[number];

/**
 * A direction's vehicle, by its line's code or its route's mode; null for a
 * mode the design draws no header for (UV Express, P2P, tricycle).
 */
/** What rides a line of its own, a train or the ferry: a RouteCardRailway's Property 1 (4261:15199). */
export const RAILWAY_VEHICLES = [...RAIL_LINES, 'Ferry'] as const;
export type RailwayVehicle = (typeof RAILWAY_VEHICLES)[number];

/** A direction's train line, or Ferry; null for a road vehicle's. */
export function railwayOf(direction: Direction): RailwayVehicle | null {
  return railLineOf(direction) ?? (isFerry(direction.route?.mode) ? 'Ferry' : null);
}

export function vehicleOf(direction: Direction): Vehicle | null {
  const line = railLineOf(direction);
  if (line) return line;
  switch (direction.route?.mode) {
    case 'jeepney':
      return 'Jeepney';
    case 'e_jeepney':
      return 'E-Jeep';
    case 'bus':
      return 'Bus';
    case 'ferry':
      return 'Ferry';
    default:
      return null;
  }
}

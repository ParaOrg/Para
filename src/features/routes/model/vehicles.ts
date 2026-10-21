import { isFerry, RAIL_LINES, railLineOf, type Direction } from './routes';

/**
 * What a trip rides, as its header names it: a train's line by its code, or
 * the vehicle's own word. The owner's TimelineRouteDetail variants
 * (4181:10844): Default the LRT-1, Variant2 the Jeepney, Variant3 the Bus,
 * Variant4 the E-Jeep, Variant5 the Ferry; UV Express is Figma's Modes
 * (4236:17040), with no header variant drawn yet.
 */
export const VEHICLES = [...RAIL_LINES, 'Jeepney', 'E-Jeep', 'Bus', 'Ferry', 'UV Express'] as const;
export type Vehicle = (typeof VEHICLES)[number];

/** What rides a line of its own, a train or the ferry: a RouteCardRailway's Property 1 (4261:15199). */
export const RAILWAY_VEHICLES = [...RAIL_LINES, 'Ferry'] as const;
export type RailwayVehicle = (typeof RAILWAY_VEHICLES)[number];

export const isRailwayVehicle = (word: string): word is RailwayVehicle =>
  (RAILWAY_VEHICLES as readonly string[]).includes(word);

/** A direction's train line, or Ferry; null for a road vehicle's. */
export function railwayOf(direction: Direction): RailwayVehicle | null {
  return railLineOf(direction) ?? (isFerry(direction.route?.mode) ? 'Ferry' : null);
}

/**
 * A direction's vehicle, by its line's code or its route's mode; null for a
 * mode the design draws no vehicle for (P2P, tricycle).
 */
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
    case 'uv_express':
      return 'UV Express';
    default:
      return null;
  }
}

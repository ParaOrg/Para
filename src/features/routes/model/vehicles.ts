import { RAIL_LINES, railLineOf, type Direction } from './routes';

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

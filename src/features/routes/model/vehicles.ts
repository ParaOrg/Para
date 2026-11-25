import { isBusway } from './busway';
import { isFerry, RAIL_LINES, railLineOf, type Direction } from './routes';

/**
 * What a trip rides, as its header names it: a train's line by its code, or
 * the vehicle's own word. The owner's TimelineRouteDetail variants
 * (4181:10844): Default the LRT-1, Variant2 the Jeepney, Variant3 the Bus,
 * Variant4 the E-Jeep, Variant5 the Ferry. UV Express is Figma's Modes
 * (4236:17040) only: its trip shows no header until one is drawn (trip-card).
 */
export const VEHICLES = [
  ...RAIL_LINES,
  'Jeepney',
  'E-Jeep',
  'Bus',
  'Ferry',
  'UV Express',
  'EDSA Carousel',
] as const;
export type Vehicle = (typeof VEHICLES)[number];

/**
 * What rides a line of its own, a train, the ferry or the EDSA Carousel: a line's RouteCard
 * (RouteCard, 4629:22776; the Carousel's, 4895:21229).
 */
export const RAILWAY_VEHICLES = [...RAIL_LINES, 'Ferry', 'EDSA Carousel'] as const;
export type RailwayVehicle = (typeof RAILWAY_VEHICLES)[number];

/** What rides the road: a RouteCard's mode badge on a road card. */
export type RoadVehicle = Exclude<Vehicle, RailwayVehicle>;

export const isRailwayVehicle = (word: string): word is RailwayVehicle =>
  RAILWAY_VEHICLES.some((vehicle) => vehicle === word);

/** A direction's train line, Ferry or EDSA Carousel; null for a road vehicle's. */
export function railwayOf(direction: Direction): RailwayVehicle | null {
  const mode = direction.route?.mode;
  if (isBusway(mode)) return 'EDSA Carousel';
  return railLineOf(direction) ?? (isFerry(mode) ? 'Ferry' : null);
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
    case 'busway':
      return 'EDSA Carousel';
    default:
      return null;
  }
}

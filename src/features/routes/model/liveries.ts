import type { Direction, TransportMode } from './routes';
import { railwayOf, type RailwayVehicle } from './vehicles';

/**
 * The road modes' card colours (RouteCard, 4629:22776): Card/Jeep, Card/UVExpress, Card/Ejeep and
 * Card/Bus. A route's card, its trip and its line wear its mode's.
 */
export const ROAD_LIVERIES = ['jeep', 'uv-express', 'ejeep', 'bus'] as const;
export type RoadLivery = (typeof ROAD_LIVERIES)[number];

export const isRoadLivery = (livery: string): livery is RoadLivery =>
  (ROAD_LIVERIES as readonly string[]).includes(livery);

/**
 * A train route's colour is its line's (Map/Rail/LightRailWayOne, LightRailWayTwo and
 * MetroRailWayThree, by the line its routeCode names); the ferry's is Map/Ferry (RouteCardRailway,
 * 4261:15199).
 */
export const RAILWAY_LIVERY = {
  'LRT-1': 'light-rail-way-one',
  'LRT-2': 'light-rail-way-two',
  'MRT-3': 'metro-rail-way-three',
  Ferry: 'ferry',
} as const satisfies Record<RailwayVehicle, string>;
type RailwayLivery = (typeof RAILWAY_LIVERY)[RailwayVehicle];

/** Every colour a card may wear: a road mode's, or a train line's or the ferry's own. */
export const LIVERIES = [...ROAD_LIVERIES, ...Object.values(RAILWAY_LIVERY)] as const;
export type Livery = RoadLivery | RailwayLivery;

/**
 * A road mode's colour. P2P borrows UV Express until it is drawn. Tricycle has no look of its own
 * yet, and a jeepney is what most routes are, so it and anything else unnamed wear Jeep's.
 */
const ROAD_LIVERY = {
  jeepney: 'jeep',
  e_jeepney: 'ejeep',
  bus: 'bus',
  uv_express: 'uv-express',
  p2p: 'uv-express',
} as const satisfies Partial<Record<TransportMode, RoadLivery>>;

const isNamedRoadMode = (mode: string): mode is keyof typeof ROAD_LIVERY => mode in ROAD_LIVERY;

/** What a direction's card, trip and line wear: its train line's or the ferry's, else its mode's. */
export function liveryOf(direction: Direction): Livery {
  const railway = railwayOf(direction);
  if (railway) return RAILWAY_LIVERY[railway];
  const mode = direction.route?.mode;
  return mode && isNamedRoadMode(mode) ? ROAD_LIVERY[mode] : 'jeep';
}

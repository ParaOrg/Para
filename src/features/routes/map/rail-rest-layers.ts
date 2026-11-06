import type { ExpressionSpecification } from 'maplibre-gl';

import { MAP_COLOURS } from '@/design-system/foundation/map-colours';

import { LIVERY_LINE } from './livery-line';
import type { Livery } from '../model/liveries';
import type { RailLine } from '../model/routes';

/** The resting lines, every direction: what the map shows of a direction on screen. */
export const ROUTES_LINE = 'saved-routes-line';

/**
 * A train line at rest, in its own line's pale, Map/Rail/<line>/surface-pale,
 * where every road route rests in its mode's colour (ROAD_AT_REST). A
 * layer a line, each one colour and a filter set once: one data-driven
 * line-color would give the resting line a GL program of its own, which the
 * casing, the ride's rest and the warm-up share with it now
 * (gl-programs-test). Lit, a train's line is drawn over its pale as every lit
 * line is, in its card's colour (useLitLineColour).
 */
export const RAIL_AT_REST = {
  'LRT-1': {
    id: 'saved-routes-rail-lrt-1',
    colour: MAP_COLOURS['Map/Rail/LightRailWayOne/surface-pale'],
  },
  'LRT-2': {
    id: 'saved-routes-rail-lrt-2',
    colour: MAP_COLOURS['Map/Rail/LightRailWayTwo/surface-pale'],
  },
  'MRT-3': {
    id: 'saved-routes-rail-mrt-3',
    colour: MAP_COLOURS['Map/Rail/MetroRailWayThree/surface-pale'],
  },
} as const satisfies Record<RailLine, { id: string; colour: string }>;

/**
 * The road modes that rest in a layer of their own, each in its line's colour, the colour its card's
 * routes are lit in (LIVERY_LINE): UV Express and E-Jeep in their cards' border shades, so they
 * show on the light basemap. Jeep, and what wears it, rests in ROUTES_LINE. As for the trains, a
 * layer a colour keeps the resting lines on one GL program.
 */
export const ROAD_AT_REST = {
  'uv-express': { id: 'saved-routes-road-uv-express', colour: LIVERY_LINE['uv-express'].line },
  ejeep: { id: 'saved-routes-road-ejeep', colour: LIVERY_LINE.ejeep.line },
  bus: { id: 'saved-routes-road-bus', colour: LIVERY_LINE.bus.line },
  ferry: { id: 'saved-routes-road-ferry', colour: LIVERY_LINE.ferry.line },
} as const satisfies Partial<Record<Livery, { id: string; colour: string }>>;
type OwnRestLook = keyof typeof ROAD_AT_REST;
const OWN_REST_LOOKS = Object.keys(ROAD_AT_REST);

/** The jeeps' resting line: Jeep's colour, under every road route without a layer of its own. */
export const ROUTES_LINE_COLOUR = LIVERY_LINE.jeep.line;

/** A resting layer: the jeeps', a road mode's own, or a train line's pale. */
type RestingLayer =
  | typeof ROUTES_LINE
  | (typeof ROAD_AT_REST)[OwnRestLook]['id']
  | (typeof RAIL_AT_REST)[RailLine]['id'];

/** The resting lines' layers, every one: what a query for the lines on screen asks. */
export const RESTING_LAYERS: RestingLayer[] = [
  ROUTES_LINE,
  ...Object.values(ROAD_AT_REST).map((r) => r.id),
  RAIL_AT_REST['LRT-1'].id,
  RAIL_AT_REST['LRT-2'].id,
  RAIL_AT_REST['MRT-3'].id,
];

/** Which features a layer draws, by the train line a feature's route runs on ('' for none). */
const restsOn = (line: RailLine | ''): ExpressionSpecification => ['==', ['get', 'line'], line];
/**
 * The contributor page's resting layers (published-routes.ts): every road route in one line, each
 * train on its own. The public map's and the studio's are SAVED_REST_FILTER.
 */
export const RESTING_FILTER = {
  [ROUTES_LINE]: restsOn(''),
  [RAIL_AT_REST['LRT-1'].id]: restsOn('LRT-1'),
  [RAIL_AT_REST['LRT-2'].id]: restsOn('LRT-2'),
  [RAIL_AT_REST['MRT-3'].id]: restsOn('MRT-3'),
} satisfies Record<
  typeof ROUTES_LINE | (typeof RAIL_AT_REST)[RailLine]['id'],
  ExpressionSpecification
>;

/** A road route wearing `look` (saved-routes-data.ts's `look`). */
const wears = (look: OwnRestLook): ExpressionSpecification => [
  'all',
  restsOn(''),
  ['==', ['get', 'look'], look],
];

/** Which features each of the public map's and the studio's resting layers draws. */
export const SAVED_REST_FILTER = {
  [ROUTES_LINE]: ['all', restsOn(''), ['!', ['in', ['get', 'look'], ['literal', OWN_REST_LOOKS]]]],
  [ROAD_AT_REST['uv-express'].id]: wears('uv-express'),
  [ROAD_AT_REST.ejeep.id]: wears('ejeep'),
  [ROAD_AT_REST.bus.id]: wears('bus'),
  [ROAD_AT_REST.ferry.id]: wears('ferry'),
  [RAIL_AT_REST['LRT-1'].id]: restsOn('LRT-1'),
  [RAIL_AT_REST['LRT-2'].id]: restsOn('LRT-2'),
  [RAIL_AT_REST['MRT-3'].id]: restsOn('MRT-3'),
} satisfies Record<RestingLayer, ExpressionSpecification>;

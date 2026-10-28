import type { ExpressionSpecification } from 'maplibre-gl';

import { MAP_COLOURS } from '@/design-system/foundation/map-colours';

import type { RailLine } from '../model/routes';

/** The resting lines, every direction: what the map shows of a direction on screen. */
export const ROUTES_LINE = 'saved-routes-line';

/**
 * A train line at rest, in its own line's pale, Map/Rail/<line>/surface-pale,
 * where every jeepney line rests in the light blue (the owner's call). A
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

/** A resting layer: the light blue's, or a train line's pale. */
type RestingLayer = typeof ROUTES_LINE | (typeof RAIL_AT_REST)[RailLine]['id'];

/** The resting lines' layers, the light blue's and each train line's: what a query for the lines on screen asks. */
export const RESTING_LAYERS: RestingLayer[] = [
  ROUTES_LINE,
  RAIL_AT_REST['LRT-1'].id,
  RAIL_AT_REST['LRT-2'].id,
  RAIL_AT_REST['MRT-3'].id,
];

/** Which features each resting layer draws, by the train line a feature's route runs on ('' for none). */
const restsOn = (line: RailLine | ''): ExpressionSpecification => ['==', ['get', 'line'], line];
export const RESTING_FILTER = {
  [ROUTES_LINE]: restsOn(''),
  [RAIL_AT_REST['LRT-1'].id]: restsOn('LRT-1'),
  [RAIL_AT_REST['LRT-2'].id]: restsOn('LRT-2'),
  [RAIL_AT_REST['MRT-3'].id]: restsOn('MRT-3'),
} satisfies Record<RestingLayer, ReturnType<typeof restsOn>>;

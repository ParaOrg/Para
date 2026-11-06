import { MAP_COLOURS, MODE_COLOURS } from '@/design-system/foundation/map-colours';

import type { Livery } from '../model/liveries';

/**
 * How a lit route line is painted: the line, the chevrons flowing inside it,
 * and the rest of the line past a picked hintuan. The end circles ring in
 * the line's colour by the card's own classes (EndTitles).
 */
export interface LineLook {
  line: string;
  arrow: string;
  /** From a picked hintuan to where the trip goes (ride-rest.ts): the card's surface-pale. */
  pale: string;
}

/**
 * A picked RouteCard's routes, and an open trip's line, in the card's own
 * colour (the owner's call): a road mode's MODE_COLOURS, a train's its line's
 * Map/Rail/<line>/surface, the ferry's Map/Ferry/surface. The chevrons are
 * Map/RouteLine/Arrow/Rest, white, on the dark lines, and …/Arrow/Inverse,
 * near-black, on the light ones (UV Express, E-Jeep, MRT-3's yellow), as their
 * cards' words are. Past a picked hintuan the rest of the trip's line is a
 * train's surface-pale, and for a road mode Map/RouteLine/surface-default,
 * the light purple: the modes have no pale of their own. (A road route at
 * rest wears its line colour, ROAD_AT_REST, so this pale is the light purple
 * alone.)
 */
const REST = MAP_COLOURS['Map/RouteLine/surface-default'];
const WHITE_ARROW = MAP_COLOURS['Map/RouteLine/Arrow/Rest'];
const DARK_ARROW = MAP_COLOURS['Map/RouteLine/Arrow/Inverse'];

export const LIVERY_LINE = {
  jeep: { line: MODE_COLOURS['Card/Jeep/Jeep-surface'], arrow: WHITE_ARROW, pale: REST },
  'uv-express': {
    line: MODE_COLOURS['Card/UVExpress/UVExpress-surface-border'],
    arrow: DARK_ARROW,
    pale: REST,
  },
  ejeep: { line: MODE_COLOURS['Card/Ejeep/Ejeep-surface-border'], arrow: DARK_ARROW, pale: REST },
  bus: { line: MODE_COLOURS['Card/Bus/Bus-surface'], arrow: WHITE_ARROW, pale: REST },
  'light-rail-way-one': {
    line: MAP_COLOURS['Map/Rail/LightRailWayOne/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
    pale: MAP_COLOURS['Map/Rail/LightRailWayOne/surface-pale'],
  },
  'light-rail-way-two': {
    line: MAP_COLOURS['Map/Rail/LightRailWayTwo/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
    pale: MAP_COLOURS['Map/Rail/LightRailWayTwo/surface-pale'],
  },
  'metro-rail-way-three': {
    line: MAP_COLOURS['Map/Rail/MetroRailWayThree/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Inverse'],
    pale: MAP_COLOURS['Map/Rail/MetroRailWayThree/surface-pale'],
  },
  ferry: {
    line: MAP_COLOURS['Map/Ferry/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
    pale: MAP_COLOURS['Map/Ferry/surface-pale'],
  },
} satisfies Record<Livery, LineLook>;

/**
 * Every other lit line — a list's or a hotspot card's with no card picked,
 * and the studio's: Map/RouteLine/surface-selected. Its pale is its own
 * colour: a hintuan is picked on an open trip, which wears its card's, so
 * nothing is picked while the blue is worn.
 */
export const LIT_LINE: LineLook = {
  line: MAP_COLOURS['Map/RouteLine/surface-selected'],
  arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
  pale: MAP_COLOURS['Map/RouteLine/surface-selected'],
};

/**
 * What a lit line wears, for the labels on the map (RouteLineLabel,
 * RouteLineEndingsLabel): a card's colour, or `selected`, the blue with no
 * card picked.
 */
type LineColour = Livery | 'selected';

/** A label's fill in the line's colour (the owner's call). */
export const LINE_SURFACE = {
  jeep: 'bg-card-jeep-surface',
  'uv-express': 'bg-card-uv-express-surface-border',
  ejeep: 'bg-card-ejeep-surface-border',
  bus: 'bg-card-bus-surface',
  'light-rail-way-one': 'bg-map-rail-light-rail-way-one-surface',
  'light-rail-way-two': 'bg-map-rail-light-rail-way-two-surface',
  'metro-rail-way-three': 'bg-map-rail-metro-rail-way-three-surface',
  ferry: 'bg-map-ferry-surface',
  selected: 'bg-map-route-line-surface-selected',
} satisfies Record<LineColour, string>;

/** The pointer under an end's label, in the line's colour (RouteLineEndingsLabel). */
export const LINE_FILL = {
  jeep: 'fill-card-jeep-surface',
  'uv-express': 'fill-card-uv-express-surface-border',
  ejeep: 'fill-card-ejeep-surface-border',
  bus: 'fill-card-bus-surface',
  'light-rail-way-one': 'fill-map-rail-light-rail-way-one-surface',
  'light-rail-way-two': 'fill-map-rail-light-rail-way-two-surface',
  'metro-rail-way-three': 'fill-map-rail-metro-rail-way-three-surface',
  ferry: 'fill-map-ferry-surface',
  selected: 'fill-map-route-line-surface-selected',
} satisfies Record<LineColour, string>;

/**
 * A label's own words and icons, on its line-coloured fill: a mode's
 * on-surface, as its card's words are; white on a train's, and near-black
 * (Map/RouteLine/Arrow/Inverse) on MRT-3's yellow, as its chevrons are.
 */
export const LINE_WORDS = {
  jeep: 'text-card-jeep-on-surface',
  'uv-express': 'text-card-uv-express-on-surface',
  ejeep: 'text-card-ejeep-on-surface',
  bus: 'text-card-bus-on-surface',
  'light-rail-way-one': 'text-content-inverse',
  'light-rail-way-two': 'text-content-inverse',
  'metro-rail-way-three': 'text-map-route-line-arrow-inverse',
  ferry: 'text-content-inverse',
  selected: 'text-content-inverse',
} satisfies Record<LineColour, string>;

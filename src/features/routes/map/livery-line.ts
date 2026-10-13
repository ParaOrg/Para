import {
  CARD_COLOURS,
  CARD_PALE_COLOURS,
  MAP_COLOURS,
} from '@/design-system/foundation/map-colours';

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
 * colour (the owner's ask, 2026-09-29: "the highlighted route should change
 * the color to the surface color of selected routecard", and the trip's
 * line too). Card/<livery>/surface, the chevrons in Map/RouteLine/Arrow/Rest,
 * white, as the card's own words are on every livery (…/Arrow/Inverse,
 * near-black, on the light one until yellow left on 2026-10-12); and past a
 * picked hintuan the rest of the trip's line in Card/<livery>/surface-pale
 * (the owner's ask, 2026-10-12: "the remaining line should be surface-pale
 * of the selected colour"). A train's line wears its own line's
 * Map/Rail/<line>/surface and surface-pale (2026-10-13), and MRT-3's
 * yellow takes …/Arrow/Inverse, near-black, as its card's words are dark.
 */
export const LIVERY_LINE = {
  red: {
    line: CARD_COLOURS['Card/red/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
    pale: CARD_PALE_COLOURS['Card/red/surface-pale'],
  },
  orange: {
    line: CARD_COLOURS['Card/orange/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
    pale: CARD_PALE_COLOURS['Card/orange/surface-pale'],
  },
  violet: {
    line: CARD_COLOURS['Card/violet/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
    pale: CARD_PALE_COLOURS['Card/violet/surface-pale'],
  },
  rose: {
    line: CARD_COLOURS['Card/rose/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
    pale: CARD_PALE_COLOURS['Card/rose/surface-pale'],
  },
  fuchsia: {
    line: CARD_COLOURS['Card/fuchsia/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
    pale: CARD_PALE_COLOURS['Card/fuchsia/surface-pale'],
  },
  pink: {
    line: CARD_COLOURS['Card/pink/surface'],
    arrow: MAP_COLOURS['Map/RouteLine/Arrow/Rest'],
    pale: CARD_PALE_COLOURS['Card/pink/surface-pale'],
  },
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
export type LineColour = Livery | 'selected';

/** A label's fill in the line's colour (the owner's "must be the color of routeline", 2026-10-13). */
export const LINE_SURFACE = {
  red: 'bg-card-red-surface',
  orange: 'bg-card-orange-surface',
  violet: 'bg-card-violet-surface',
  rose: 'bg-card-rose-surface',
  fuchsia: 'bg-card-fuchsia-surface',
  pink: 'bg-card-pink-surface',
  'light-rail-way-one': 'bg-map-rail-light-rail-way-one-surface',
  'light-rail-way-two': 'bg-map-rail-light-rail-way-two-surface',
  'metro-rail-way-three': 'bg-map-rail-metro-rail-way-three-surface',
  selected: 'bg-map-route-line-surface-selected',
} satisfies Record<LineColour, string>;

/**
 * Words in the line's colour, on white: a station's sign code (RouteLineLabel's
 * CodeSignEnd, RouteLineEndingsLabel's CodeSign). A train's are its line's
 * Timeline/surface, as the white pill on its trip card has them (the owner's
 * train frames, 2026-10-13): MRT-3's yellow would not read on white.
 */
export const LINE_TEXT = {
  red: 'text-card-red-surface',
  orange: 'text-card-orange-surface',
  violet: 'text-card-violet-surface',
  rose: 'text-card-rose-surface',
  fuchsia: 'text-card-fuchsia-surface',
  pink: 'text-card-pink-surface',
  'light-rail-way-one': 'text-map-rail-light-rail-way-one-timeline-surface',
  'light-rail-way-two': 'text-map-rail-light-rail-way-two-timeline-surface',
  'metro-rail-way-three': 'text-map-rail-metro-rail-way-three-timeline-surface',
  selected: 'text-map-route-line-surface-selected',
} satisfies Record<LineColour, string>;

/** The pointer under an end's label, in the line's colour (RouteLineEndingsLabel). */
export const LINE_FILL = {
  red: 'fill-card-red-surface',
  orange: 'fill-card-orange-surface',
  violet: 'fill-card-violet-surface',
  rose: 'fill-card-rose-surface',
  fuchsia: 'fill-card-fuchsia-surface',
  pink: 'fill-card-pink-surface',
  'light-rail-way-one': 'fill-map-rail-light-rail-way-one-surface',
  'light-rail-way-two': 'fill-map-rail-light-rail-way-two-surface',
  'metro-rail-way-three': 'fill-map-rail-metro-rail-way-three-surface',
  selected: 'fill-map-route-line-surface-selected',
} satisfies Record<LineColour, string>;

/**
 * A label's own words and icons, on its line-coloured fill: white, as the
 * chevrons are; near-black (Map/RouteLine/Arrow/Inverse) on MRT-3's
 * yellow, as its chevrons and its card's words are (2026-10-13).
 */
export const LINE_WORDS = {
  red: 'text-content-inverse',
  orange: 'text-content-inverse',
  violet: 'text-content-inverse',
  rose: 'text-content-inverse',
  fuchsia: 'text-content-inverse',
  pink: 'text-content-inverse',
  'light-rail-way-one': 'text-content-inverse',
  'light-rail-way-two': 'text-content-inverse',
  'metro-rail-way-three': 'text-map-route-line-arrow-inverse',
  selected: 'text-content-inverse',
} satisfies Record<LineColour, string>;

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
 * of the selected colour").
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
  selected: 'bg-map-route-line-surface-selected',
} satisfies Record<LineColour, string>;

/**
 * Words in the line's colour, on white: a station's sign code (RouteLineLabel's
 * CodeSignEnd, RouteLineEndingsLabel's CodeSign).
 */
export const LINE_TEXT = {
  red: 'text-card-red-surface',
  orange: 'text-card-orange-surface',
  violet: 'text-card-violet-surface',
  rose: 'text-card-rose-surface',
  fuchsia: 'text-card-fuchsia-surface',
  pink: 'text-card-pink-surface',
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
  selected: 'fill-map-route-line-surface-selected',
} satisfies Record<LineColour, string>;

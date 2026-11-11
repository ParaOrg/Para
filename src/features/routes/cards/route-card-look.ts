import type { Livery } from '../model/liveries';

/*
 * How each livery paints a RouteCard (RouteCard, 4629:22776), where the card's colours differ
 * from the trip card's (livery-card.ts). Figma binds each part to the variables below.
 */

/** The card's fill, and the hairline above and below it. */
export const ROUTE_CARD_SURFACE = {
  jeep: 'bg-card-jeep-surface border-card-jeep-surface-border',
  'uv-express': 'bg-card-uv-express-surface border-card-uv-express-surface-border',
  ejeep: 'bg-card-ejeep-surface border-card-ejeep-surface-border',
  bus: 'bg-card-bus-surface border-card-bus-surface-border',
  'light-rail-way-one':
    'bg-map-rail-light-rail-way-one-surface border-map-rail-light-rail-way-one-timeline-surface',
  'light-rail-way-two':
    'bg-map-rail-light-rail-way-two-surface border-map-rail-light-rail-way-two-timeline-surface',
  'metro-rail-way-three':
    'bg-map-rail-metro-rail-way-three-surface border-map-rail-metro-rail-way-three-border-primary',
  ferry: 'bg-map-ferry-surface border-map-ferry-border-primary',
} satisfies Record<Livery, string>;

/** The origin, the rows and the tree lines. Figma writes the light lines' words in Card/Bus/on-surface. */
export const ROUTE_CARD_TEXT = {
  jeep: 'text-card-jeep-on-surface',
  'uv-express': 'text-card-uv-express-on-surface',
  ejeep: 'text-card-ejeep-on-surface',
  bus: 'text-card-bus-on-surface',
  'light-rail-way-one': 'text-card-bus-on-surface',
  'light-rail-way-two': 'text-card-bus-on-surface',
  'metro-rail-way-three': 'text-surface-inverse',
  ferry: 'text-card-bus-on-surface',
} satisfies Record<Livery, string>;

/**
 * Figma's RouteBadge: the mode, a train's line and bound, and its station codes, each in the
 * card's own colour on a chip. A light card's chip is dark (Background/surface-inverse); every other
 * card's is Card/Bus/on-surface.
 */
export const ROUTE_BADGE = {
  jeep: 'bg-card-bus-on-surface text-card-jeep-surface',
  'uv-express': 'bg-surface-inverse text-card-uv-express-surface',
  ejeep: 'bg-surface-inverse text-card-ejeep-surface',
  bus: 'bg-card-bus-on-surface text-card-bus-surface',
  'light-rail-way-one': 'bg-card-bus-on-surface text-map-rail-light-rail-way-one-surface',
  'light-rail-way-two': 'bg-card-bus-on-surface text-map-rail-light-rail-way-two-surface',
  'metro-rail-way-three': 'bg-surface-inverse text-map-rail-metro-rail-way-three-surface',
  ferry: 'bg-card-bus-on-surface text-map-ferry-surface',
} satisfies Record<Livery, string>;

/**
 * The Blob's place on a RouteCard: 33 above the card's top, where BLOB_PLACE's sits 73 above
 * (the contribution card's), plus the 128 of blur room the files carry on every side. Pixels, as BLOB_PLACE's
 * are, so the glow stays put at a larger default text size.
 */
export const ROUTE_CARD_BLOB_PLACE =
  'pointer-events-none absolute -top-[161px] left-1/2 -z-10 h-[525.538px] w-[795.076px] max-w-none -translate-x-1/2';

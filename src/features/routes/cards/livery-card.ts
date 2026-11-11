import type { CardFill } from '@/design-system/primitives/button-look';

import blobInverse from './route-card-blob-inverse.svg';
import blobPrimary from './route-card-blob-primary.svg';
import type { Livery } from '../model/liveries';

/**
 * How a livery paints a card, for the list's cards and a trip's card alike
 * (TimelineRouteDetailCard), so a trip opens in the colours of the card it was
 * picked from.
 *
 * A road mode wears its Card/<Mode> variables (RouteCard, 4629:22776): its
 * surface, with surface-border above and below, its words in on-surface. Jeep
 * and Bus sit under Route/RouteCardPrimary and the Primary Blob; UV Express and
 * E-Jeep, light cards with dark words, under Route/RouteCardInverse, its Blob
 * softened 2px more. Each mode's surface-secondary, its darker step, is the
 * trip's rail and a pressed row. Past a picked hintuan a road mode has no pale
 * of its own: the rest of the ride is drawn in the light purple
 * (Map/RouteLine/surface-default).
 *
 * A train route wears its line's colours (Figma's RouteCards for them,
 * 4074:7402 LRT-1, 4080:4124 LRT-2, 4080:4241 MRT-3): Map/Rail/<line>/surface
 * and border-primary, the rail and the pressed rows in its Timeline/surface,
 * all three under Route/RouteCardPrimary and the Primary Blob. LRT-1 and
 * LRT-2 write in Content/inverse; MRT-3, on its yellow, in Content/primary —
 * dark words, but under the Primary shadow and Blob its frame draws, not the
 * Inverse ones. The ferry wears Map/Ferry as a train its line's, its words in
 * Content/inverse (RouteCard, 4629:22776).
 */

export const CARD_SURFACE = {
  jeep: 'bg-card-jeep-surface border-card-jeep-surface-border',
  'uv-express': 'bg-card-uv-express-surface border-card-uv-express-surface-border',
  ejeep: 'bg-card-ejeep-surface border-card-ejeep-surface-border',
  bus: 'bg-card-bus-surface border-card-bus-surface-border',
  'light-rail-way-one':
    'bg-map-rail-light-rail-way-one-surface border-map-rail-light-rail-way-one-border-primary',
  'light-rail-way-two':
    'bg-map-rail-light-rail-way-two-surface border-map-rail-light-rail-way-two-border-primary',
  'metro-rail-way-three':
    'bg-map-rail-metro-rail-way-three-surface border-map-rail-metro-rail-way-three-border-primary',
  ferry: 'bg-map-ferry-surface border-map-ferry-border-primary',
} satisfies Record<Livery, string>;

/**
 * The rest of a lit line past a picked hintuan, and the dots along it: a
 * train's Map/…/surface-pale, a road mode's the light purple
 * (Map/RouteLine/surface-default), the circles included. The line is painted from the same tokens in hex
 * (map-colours.ts, useRideRest); these ring the dots, DOM markers
 * (StationLabels).
 */
export const CARD_SURFACE_PALE = {
  jeep: 'bg-map-route-line-surface-default',
  'uv-express': 'bg-map-route-line-surface-default',
  ejeep: 'bg-map-route-line-surface-default',
  bus: 'bg-map-route-line-surface-default',
  'light-rail-way-one': 'bg-map-rail-light-rail-way-one-surface-pale',
  'light-rail-way-two': 'bg-map-rail-light-rail-way-two-surface-pale',
  'metro-rail-way-three': 'bg-map-rail-metro-rail-way-three-surface-pale',
  ferry: 'bg-map-ferry-surface-pale',
} satisfies Record<Livery, string>;

export const CARD_TEXT = {
  jeep: 'text-card-jeep-on-surface',
  'uv-express': 'text-card-uv-express-on-surface',
  ejeep: 'text-card-ejeep-on-surface',
  bus: 'text-card-bus-on-surface',
  'light-rail-way-one': 'text-content-inverse',
  'light-rail-way-two': 'text-content-inverse',
  'metro-rail-way-three': 'text-content-primary',
  ferry: 'text-content-inverse',
} satisfies Record<Livery, string>;

// Drawn over the card, as Figma lays it: above the Blob and the words.
export const CARD_SHADOW = {
  jeep: 'shadow-route-card-primary',
  'uv-express': 'shadow-route-card-inverse',
  ejeep: 'shadow-route-card-inverse',
  bus: 'shadow-route-card-primary',
  'light-rail-way-one': 'shadow-route-card-primary',
  'light-rail-way-two': 'shadow-route-card-primary',
  'metro-rail-way-three': 'shadow-route-card-primary',
  ferry: 'shadow-route-card-primary',
} satisfies Record<Livery, string>;

// A RouteCard's State=Selected: pressed in, and nothing else changes — the
// fill, the words, the Blob stay the Rest card's.
export const CARD_SHADOW_SELECTED = {
  jeep: 'shadow-route-card-primary-selected',
  'uv-express': 'shadow-route-card-inverse-selected',
  ejeep: 'shadow-route-card-inverse-selected',
  bus: 'shadow-route-card-primary-selected',
  'light-rail-way-one': 'shadow-route-card-primary-selected',
  'light-rail-way-two': 'shadow-route-card-primary-selected',
  'metro-rail-way-three': 'shadow-route-card-primary-selected',
  ferry: 'shadow-route-card-primary-selected',
} satisfies Record<Livery, string>;

// Figma's Blob, Primary and Inverse: a white glow over the card's top,
// 539×270 around its centre, 73px above it. The files carry 128px of blur
// room on every side, so the image is placed 128px further out (BLOB_PLACE).
// It lies behind the words (-z-10 inside the card's own stacking context,
// `isolate`), so nothing above it needs `relative` — which would trap a
// card's name, stretched over the card, inside that element instead.
//
// The Blob's "image 13" layer is left out: it sits some 840px below the card,
// where nothing shows. One correction to Figma's export of the Primary Blob:
// its outer 2px blur came out with a region only 4px round the shape, which
// cut the 64px glow into hard edges on any card wider than 547px (the docked
// list at 640, a tablet) — widened to the whole image, as the inner blur and
// the Inverse file already are.
export const CARD_BLOB = {
  jeep: { src: blobPrimary, className: '' },
  'uv-express': { src: blobInverse, className: 'blur-[2px]' },
  ejeep: { src: blobInverse, className: 'blur-[2px]' },
  bus: { src: blobPrimary, className: '' },
  'light-rail-way-one': { src: blobPrimary, className: '' },
  'light-rail-way-two': { src: blobPrimary, className: '' },
  'metro-rail-way-three': { src: blobPrimary, className: '' },
  ferry: { src: blobPrimary, className: '' },
} satisfies Record<Livery, { src: string; className: string }>;

// Pixels, all three, like the glow inside the file: the rem scale
// (-top-50.25) would drift from the image at a larger default text size.
export const BLOB_PLACE =
  'pointer-events-none absolute -top-[201px] left-1/2 -z-10 h-[525.538px] w-[795.076px] max-w-none -translate-x-1/2';

/** A trip's rail and its dots' rings: a road mode's surface-secondary, a train's Timeline/surface. */
export const TIMELINE_SURFACE = {
  jeep: 'bg-card-jeep-surface-secondary',
  'uv-express': 'bg-card-uv-express-surface-secondary',
  ejeep: 'bg-card-ejeep-surface-secondary',
  bus: 'bg-card-bus-surface-secondary',
  'light-rail-way-one': 'bg-map-rail-light-rail-way-one-timeline-surface',
  'light-rail-way-two': 'bg-map-rail-light-rail-way-two-timeline-surface',
  'metro-rail-way-three': 'bg-map-rail-metro-rail-way-three-timeline-surface',
  ferry: 'bg-map-ferry-timeline-surface',
} satisfies Record<Livery, string>;

/**
 * A row Pressed, while the finger is down on it: the whole row in the card's
 * TIMELINE_SURFACE — a RouteCard's row (RouteEndPointBar,
 * 3848:11928) and every row of the trip's timeline, where the rail runs into
 * it and only the dot's white shows (Timeline, 3716:1894). The phone's own
 * tap highlight is off, so the colour under the finger is the token's.
 */
export const ROW_PRESSED = {
  jeep: 'active:bg-card-jeep-surface-secondary [-webkit-tap-highlight-color:transparent]',
  'uv-express':
    'active:bg-card-uv-express-surface-secondary [-webkit-tap-highlight-color:transparent]',
  ejeep: 'active:bg-card-ejeep-surface-secondary [-webkit-tap-highlight-color:transparent]',
  bus: 'active:bg-card-bus-surface-secondary [-webkit-tap-highlight-color:transparent]',
  'light-rail-way-one':
    'active:bg-map-rail-light-rail-way-one-timeline-surface [-webkit-tap-highlight-color:transparent]',
  'light-rail-way-two':
    'active:bg-map-rail-light-rail-way-two-timeline-surface [-webkit-tap-highlight-color:transparent]',
  'metro-rail-way-three':
    'active:bg-map-rail-metro-rail-way-three-timeline-surface [-webkit-tap-highlight-color:transparent]',
  ferry: 'active:bg-map-ferry-timeline-surface [-webkit-tap-highlight-color:transparent]',
} satisfies Record<Livery, string>;

/**
 * A picked hintuan's pill, with the pesos to it (Figma's Timeline
 * State=Selected, 3769:2847): the card's own colour on Content/inverse, and on
 * the light UV Express and E-Jeep cards the other way round, on-surface under
 * the card's colour. A train's pill is white
 * too, on every line, its words in the line's Timeline/surface, not its
 * surface: Figma's three train frames draw it so, MRT-3's dark words
 * included.
 */
export const TIMELINE_PILL = {
  jeep: 'bg-content-inverse text-card-jeep-surface',
  'uv-express': 'bg-card-uv-express-on-surface text-card-uv-express-surface',
  ejeep: 'bg-card-ejeep-on-surface text-card-ejeep-surface',
  bus: 'bg-content-inverse text-card-bus-surface',
  'light-rail-way-one': 'bg-content-inverse text-map-rail-light-rail-way-one-timeline-surface',
  'light-rail-way-two': 'bg-content-inverse text-map-rail-light-rail-way-two-timeline-surface',
  'metro-rail-way-three': 'bg-content-inverse text-map-rail-metro-rail-way-three-timeline-surface',
  ferry: 'bg-content-inverse text-map-ferry-timeline-surface',
} satisfies Record<Livery, string>;

/**
 * Set as start and × Remove as start, on the card they sit on: Button's
 * Primary filled with the card's colours, since it sits on top of the card
 * (Figma's instance, 4147:11947, fills with Card/red/surface), a train's in
 * its line's.
 */
export const BUTTON_FILL = {
  jeep: 'card-jeep',
  'uv-express': 'card-uv-express',
  ejeep: 'card-ejeep',
  bus: 'card-bus',
  'light-rail-way-one': 'map-rail-light-rail-way-one',
  'light-rail-way-two': 'map-rail-light-rail-way-two',
  'metro-rail-way-three': 'map-rail-metro-rail-way-three',
  ferry: 'map-ferry',
} as const satisfies Record<Livery, CardFill>;

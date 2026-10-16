import type { CardFill } from '@/design-system/primitives/button';

import blobInverse from './route-card-blob-inverse.svg';
import blobPrimary from './route-card-blob-primary.svg';
import type { Livery } from '../model/liveries';

/**
 * How a livery paints a card — Figma's RouteCard set (3665:2265) — for the
 * list's cards and a trip's card alike (TimelineRouteDetailCard), so a trip
 * opens in the colours of the card it was picked from.
 *
 * Red and orange write in Content/inverse under Route/RouteCardPrimary.
 * Violet, rose, fuchsia and pink (4071:7014) write the same white words under
 * Route/RouteCardInverse, its Blob brighter and softened 2px more. The Inverse
 * shadow and Blob were drawn for dark words (Content/primary); the card's own
 * are used for the trip too, so the card and the trip it opens match.
 *
 * A train route wears its line's colours (Figma's RouteCards for them,
 * 4074:7402 LRT-1, 4080:4124 LRT-2, 4080:4241 MRT-3):
 * Map/Rail/<line>/surface and border-primary, the rail and the pressed rows
 * in its Timeline/surface, all three under Route/RouteCardPrimary and the
 * Primary Blob. LRT-1 and LRT-2 write in Content/inverse; MRT-3, on its
 * yellow, in Content/primary — dark words, but under the Primary shadow and
 * Blob its frame draws, not the Inverse ones.
 */

export const CARD_SURFACE = {
  red: 'bg-card-red-surface border-card-red-border-primary',
  orange: 'bg-card-orange-surface border-card-orange-border-primary',
  violet: 'bg-card-violet-surface border-card-violet-border-primary',
  rose: 'bg-card-rose-surface border-card-rose-border-primary',
  fuchsia: 'bg-card-fuchsia-surface border-card-fuchsia-border-primary',
  pink: 'bg-card-pink-surface border-card-pink-border-primary',
  'light-rail-way-one':
    'bg-map-rail-light-rail-way-one-surface border-map-rail-light-rail-way-one-border-primary',
  'light-rail-way-two':
    'bg-map-rail-light-rail-way-two-surface border-map-rail-light-rail-way-two-border-primary',
  'metro-rail-way-three':
    'bg-map-rail-metro-rail-way-three-surface border-map-rail-metro-rail-way-three-border-primary',
} satisfies Record<Livery, string>;

/**
 * The rest of a lit line past a picked hintuan, and the dots along it:
 * Figma's Card/<livery>/surface-pale, the circles included, not the route
 * line's own colour. The line is painted from the same tokens in hex
 * (map-colours.ts, useRideRest); these ring the dots, DOM markers
 * (StationLabels).
 */
export const CARD_SURFACE_PALE = {
  red: 'bg-card-red-surface-pale',
  orange: 'bg-card-orange-surface-pale',
  violet: 'bg-card-violet-surface-pale',
  rose: 'bg-card-rose-surface-pale',
  fuchsia: 'bg-card-fuchsia-surface-pale',
  pink: 'bg-card-pink-surface-pale',
  'light-rail-way-one': 'bg-map-rail-light-rail-way-one-surface-pale',
  'light-rail-way-two': 'bg-map-rail-light-rail-way-two-surface-pale',
  'metro-rail-way-three': 'bg-map-rail-metro-rail-way-three-surface-pale',
} satisfies Record<Livery, string>;

export const CARD_TEXT = {
  red: 'text-content-inverse',
  orange: 'text-content-inverse',
  violet: 'text-content-inverse',
  rose: 'text-content-inverse',
  fuchsia: 'text-content-inverse',
  pink: 'text-content-inverse',
  'light-rail-way-one': 'text-content-inverse',
  'light-rail-way-two': 'text-content-inverse',
  'metro-rail-way-three': 'text-content-primary',
} satisfies Record<Livery, string>;

// Drawn over the card, as Figma lays it: above the Blob and the words.
export const CARD_SHADOW = {
  red: 'shadow-route-card-primary',
  orange: 'shadow-route-card-primary',
  violet: 'shadow-route-card-inverse',
  rose: 'shadow-route-card-inverse',
  fuchsia: 'shadow-route-card-inverse',
  pink: 'shadow-route-card-inverse',
  'light-rail-way-one': 'shadow-route-card-primary',
  'light-rail-way-two': 'shadow-route-card-primary',
  'metro-rail-way-three': 'shadow-route-card-primary',
} satisfies Record<Livery, string>;

// A RouteCard's State=Selected: pressed in, and nothing else
// changes — the fill, the words, the Blob stay the Rest card's.
export const CARD_SHADOW_SELECTED = {
  red: 'shadow-route-card-primary-selected',
  orange: 'shadow-route-card-primary-selected',
  violet: 'shadow-route-card-inverse-selected',
  rose: 'shadow-route-card-inverse-selected',
  fuchsia: 'shadow-route-card-inverse-selected',
  pink: 'shadow-route-card-inverse-selected',
  'light-rail-way-one': 'shadow-route-card-primary-selected',
  'light-rail-way-two': 'shadow-route-card-primary-selected',
  'metro-rail-way-three': 'shadow-route-card-primary-selected',
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
  red: { src: blobPrimary, className: '' },
  orange: { src: blobPrimary, className: '' },
  violet: { src: blobInverse, className: 'blur-[2px]' },
  rose: { src: blobInverse, className: 'blur-[2px]' },
  fuchsia: { src: blobInverse, className: 'blur-[2px]' },
  pink: { src: blobInverse, className: 'blur-[2px]' },
  'light-rail-way-one': { src: blobPrimary, className: '' },
  'light-rail-way-two': { src: blobPrimary, className: '' },
  'metro-rail-way-three': { src: blobPrimary, className: '' },
} satisfies Record<Livery, { src: string; className: string }>;

// Pixels, all three, like the glow inside the file: the rem scale
// (-top-50.25) would drift from the image at a larger default text size.
export const BLOB_PLACE =
  'pointer-events-none absolute -top-[201px] left-1/2 -z-10 h-[525.538px] w-[795.076px] max-w-none -translate-x-1/2';

/** A trip's rail and its dots' rings: Figma's Card/<livery>/Timeline/surface. */
export const TIMELINE_SURFACE = {
  red: 'bg-card-red-timeline-surface',
  orange: 'bg-card-orange-timeline-surface',
  violet: 'bg-card-violet-timeline-surface',
  rose: 'bg-card-rose-timeline-surface',
  fuchsia: 'bg-card-fuchsia-timeline-surface',
  pink: 'bg-card-pink-timeline-surface',
  'light-rail-way-one': 'bg-map-rail-light-rail-way-one-timeline-surface',
  'light-rail-way-two': 'bg-map-rail-light-rail-way-two-timeline-surface',
  'metro-rail-way-three': 'bg-map-rail-metro-rail-way-three-timeline-surface',
} satisfies Record<Livery, string>;

/**
 * A row Pressed, while the finger is down on it: the whole row in the card's
 * Card/<livery>/Timeline/surface — a RouteCard's row (RouteEndPointBar,
 * 3848:11928) and every row of the trip's timeline, where the rail runs into
 * it and only the dot's white shows (Timeline, 3716:1894). The phone's own
 * tap highlight is off, so the colour under the finger is the token's.
 */
export const ROW_PRESSED = {
  red: 'active:bg-card-red-timeline-surface [-webkit-tap-highlight-color:transparent]',
  orange: 'active:bg-card-orange-timeline-surface [-webkit-tap-highlight-color:transparent]',
  violet: 'active:bg-card-violet-timeline-surface [-webkit-tap-highlight-color:transparent]',
  rose: 'active:bg-card-rose-timeline-surface [-webkit-tap-highlight-color:transparent]',
  fuchsia: 'active:bg-card-fuchsia-timeline-surface [-webkit-tap-highlight-color:transparent]',
  pink: 'active:bg-card-pink-timeline-surface [-webkit-tap-highlight-color:transparent]',
  'light-rail-way-one':
    'active:bg-map-rail-light-rail-way-one-timeline-surface [-webkit-tap-highlight-color:transparent]',
  'light-rail-way-two':
    'active:bg-map-rail-light-rail-way-two-timeline-surface [-webkit-tap-highlight-color:transparent]',
  'metro-rail-way-three':
    'active:bg-map-rail-metro-rail-way-three-timeline-surface [-webkit-tap-highlight-color:transparent]',
} satisfies Record<Livery, string>;

/**
 * A picked hintuan's pill, with the pesos to it (Figma's Timeline
 * State=Selected, 3769:2847): the card's own colour on Content/inverse, the
 * words being white on every livery. Orange, violet, rose, fuchsia and pink
 * follow red.
 * A train's pill is white too, on every line, its words in the line's
 * Timeline/surface, not its surface: Figma's three train frames draw it so,
 * MRT-3's dark words included. The ride's E (RideMark) wears it too, its disc
 * in the pill's words' colour on the same white (Figma's RouteSigns): a pill
 * restyled restyles the E.
 */
export const TIMELINE_PILL = {
  red: 'bg-content-inverse text-card-red-surface',
  orange: 'bg-content-inverse text-card-orange-surface',
  violet: 'bg-content-inverse text-card-violet-surface',
  rose: 'bg-content-inverse text-card-rose-surface',
  fuchsia: 'bg-content-inverse text-card-fuchsia-surface',
  pink: 'bg-content-inverse text-card-pink-surface',
  'light-rail-way-one': 'bg-content-inverse text-map-rail-light-rail-way-one-timeline-surface',
  'light-rail-way-two': 'bg-content-inverse text-map-rail-light-rail-way-two-timeline-surface',
  'metro-rail-way-three': 'bg-content-inverse text-map-rail-metro-rail-way-three-timeline-surface',
} satisfies Record<Livery, string>;

/**
 * Set as start and × Remove as start, on the card they sit on: Button's
 * Primary filled with the card's colours, since it sits on top of the card
 * (Figma's instance, 4147:11947, fills with Card/red/surface), a train's in
 * its line's.
 */
export const BUTTON_FILL = {
  red: 'card-red',
  orange: 'card-orange',
  violet: 'card-violet',
  rose: 'card-rose',
  fuchsia: 'card-fuchsia',
  pink: 'card-pink',
  'light-rail-way-one': 'map-rail-light-rail-way-one',
  'light-rail-way-two': 'map-rail-light-rail-way-two',
  'metro-rail-way-three': 'map-rail-metro-rail-way-three',
} as const satisfies Record<Livery, CardFill>;

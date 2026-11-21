import type { Livery } from '../model/liveries';

/* How a trip's timeline is painted on the sheet's own surface (RouteHintuans, 4796:29755). */

/**
 * The rail, and the dots' colour on it: its mode's card fill, MRT-3's yellow as Figma's Railway
 * draws it (4825:47950). UV Express's grey does not stand out from the surface, and E-jeep has no
 * card fill among the new semantics: Text/primary for those.
 */
export const TIMELINE_RAIL = {
  jeep: 'bg-card-jeep-fill',
  'uv-express': 'bg-text-primary',
  ejeep: 'bg-text-primary',
  bus: 'bg-card-bus-fill',
  'light-rail-way-one': 'bg-card-lrt-one-fill',
  'light-rail-way-two': 'bg-card-lrt-two-fill',
  'metro-rail-way-three': 'bg-card-mrt-three-fill',
  ferry: 'bg-card-ferry-fill',
} satisfies Record<Livery, string>;

/**
 * A stop's row pressed, on the surface. Figma draws no pressed row: the surface's secondary grey
 * stands in until the owner draws one. The phone's own tap highlight is off, so the colour under
 * the finger is ours.
 */
export const STOP_PRESSED =
  'transition-colors duration-quick ease-move hover:bg-bg-surface-secondary active:bg-bg-surface-secondary [-webkit-tap-highlight-color:transparent]';

/**
 * A picked stop's pill, its code and its pesos, on the surface: Figma draws it only on a card in
 * the trip's colour, white halves with the card between them. On the white surface the halves take
 * the secondary surface, so the 2 between them still divides them.
 */
export const STOP_PILL = 'bg-bg-surface-secondary text-text-primary';

/** The stops' heading: a train's are its stations (RouteHintuans, Railway, 4825:47950). */
export const TIMELINE_HEADING = {
  jeep: 'Route Stops',
  'uv-express': 'Route Stops',
  ejeep: 'Route Stops',
  bus: 'Route Stops',
  ferry: 'Route Stops',
  'light-rail-way-one': 'Trains Stations',
  'light-rail-way-two': 'Trains Stations',
  'metro-rail-way-three': 'Trains Stations',
} satisfies Record<Livery, string>;

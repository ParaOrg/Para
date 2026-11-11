import type { Livery } from '../model/liveries';

/** Whose bar it is: the route list's (`chooser-…` to the e2e suites) or a trip's (`card-…`). */
export type ControllerOwner = 'chooser' | 'card';

/** The test id the e2e suites query PAPUNTA by, on each. */
export const WAY_TEST_ID = {
  chooser: 'chooser-flip',
  card: 'card-switch',
} satisfies Record<ControllerOwner, string>;

/**
 * The Controller's top bar where the sheet floats (4683:32635), pressed in as a route card is: the
 * list's in Card/Jeep, as the frame binds it, and a trip's in its own livery.
 */
export const WIDE_BAR = {
  list: 'sheet-floating:bg-card-jeep-surface sheet-floating:shadow-route-card-primary',
  jeep: 'sheet-floating:bg-card-jeep-surface sheet-floating:shadow-route-card-primary',
  'uv-express':
    'sheet-floating:bg-card-uv-express-surface sheet-floating:shadow-route-card-inverse',
  ejeep: 'sheet-floating:bg-card-ejeep-surface sheet-floating:shadow-route-card-inverse',
  bus: 'sheet-floating:bg-card-bus-surface sheet-floating:shadow-route-card-primary',
  'light-rail-way-one':
    'sheet-floating:bg-map-rail-light-rail-way-one-surface sheet-floating:shadow-route-card-primary',
  'light-rail-way-two':
    'sheet-floating:bg-map-rail-light-rail-way-two-surface sheet-floating:shadow-route-card-primary',
  'metro-rail-way-three':
    'sheet-floating:bg-map-rail-metro-rail-way-three-surface sheet-floating:shadow-route-card-primary',
  ferry: 'sheet-floating:bg-map-ferry-surface sheet-floating:shadow-route-card-primary',
} satisfies Record<Livery | 'list', string>;

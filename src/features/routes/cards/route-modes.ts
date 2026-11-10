import type { Vehicle } from '../model/vehicles';

/** What a RouteCard's rows ride, to a screen reader: a train's line is one word, "Train". */
export const MODE_LABEL = {
  'LRT-1': 'Train',
  'LRT-2': 'Train',
  'MRT-3': 'Train',
  Jeepney: 'Jeep',
  'E-Jeep': 'E-Jeep',
  Bus: 'Bus',
  Ferry: 'Ferry',
  'UV Express': 'UV Express',
} satisfies Record<Vehicle, string>;

/**
 * What a RouteCard's mode badge says (RouteCard, 4629:22776): a road vehicle's word, or a train's
 * line, "LRT 1", as Figma writes it.
 */
export const MODE_BADGE_LABEL = {
  'LRT-1': 'LRT 1',
  'LRT-2': 'LRT 2',
  'MRT-3': 'MRT 3',
  Jeepney: 'Jeep',
  'E-Jeep': 'E-Jeep',
  Bus: 'Bus',
  Ferry: 'Ferry',
  'UV Express': 'UV Express',
} satisfies Record<Vehicle, string>;

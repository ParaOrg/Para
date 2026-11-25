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
  'EDSA Carousel': 'EDSA Carousel',
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
  'EDSA Carousel': 'EDSA Carousel',
} satisfies Record<Vehicle, string>;

/** What a trip's Transport mode tile says (BottomContent, 4821:40538): a train's line in full, "LRT Line 1". */
export const TRANSPORT_MODE_LABEL = {
  'LRT-1': 'LRT Line 1',
  'LRT-2': 'LRT Line 2',
  'MRT-3': 'MRT Line 3',
  Jeepney: 'Jeep',
  'E-Jeep': 'E-Jeep',
  Bus: 'Bus',
  Ferry: 'Ferry',
  'UV Express': 'UV Express',
  'EDSA Carousel': 'EDSA Carousel',
} satisfies Record<Vehicle, string>;

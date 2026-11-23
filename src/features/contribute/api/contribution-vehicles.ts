import type { RideKind } from '../storage/recording-schema';

/** The vehicles the database's contribution check takes, by the name the phone keeps. */
export const VEHICLE_OF = {
  Jeep: 'jeep',
  'E-Jeep': 'e_jeep',
  'UV Express': 'uv_express',
  Bus: 'bus',
  Train: 'train',
  Ferry: 'ferry',
  Tricycle: 'tricycle',
  Other: 'other',
} as const satisfies Record<RideKind, string>;

import type { Vehicle } from './vehicles';

/**
 * The numbers behind Para's own travel-time estimate, in one place for the owner to confirm. A
 * ride's estimate is its length over its mode's speed range, plus a dwell at each stop it passes.
 * The speeds are moving speeds through Metro Manila's traffic, slow hour to free road; the dwell is
 * the time a vehicle stands at a stop. Para's own guesses, not measured: real times from
 * contributors' rides may replace them (.scratch/route-redesign/issues/17-ride-times.md).
 */
export const TRAVEL_SPEED_KMH = {
  Jeepney: { slow: 12, fast: 25 },
  'E-Jeep': { slow: 12, fast: 25 },
  Bus: { slow: 12, fast: 30 },
  'UV Express': { slow: 15, fast: 35 },
  'LRT-1': { slow: 35, fast: 45 },
  'LRT-2': { slow: 35, fast: 45 },
  'MRT-3': { slow: 30, fast: 40 },
  Ferry: { slow: 10, fast: 15 },
  // Its own lane, clear of EDSA's traffic but not of its own queue at the stations.
  'EDSA Carousel': { slow: 20, fast: 35 },
} satisfies Record<Vehicle, { slow: number; fast: number }>;

/** Minutes a vehicle stands at each stop it passes between the ride's ends. */
export const DWELL_MINUTES_PER_STOP = {
  Jeepney: 0.5,
  'E-Jeep': 0.5,
  Bus: 0.5,
  'UV Express': 0.5,
  'LRT-1': 0.5,
  'LRT-2': 0.5,
  'MRT-3': 0.5,
  Ferry: 1,
  'EDSA Carousel': 1,
} satisfies Record<Vehicle, number>;

/** The estimate's ends are rounded out to this many minutes: down for the low, up for the high. */
export const ESTIMATE_STEP_MINUTES = 5;

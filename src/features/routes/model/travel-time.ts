import { DWELL_MINUTES_PER_STOP, ESTIMATE_STEP_MINUTES, TRAVEL_SPEED_KMH } from './travel-speeds';
import type { Vehicle } from './vehicles';

/** A ride's estimated minutes, low to high, each a whole number of ESTIMATE_STEP_MINUTES. */
export interface TravelEstimate {
  low: number;
  high: number;
}

/**
 * A ride's travel time, estimated: its length over its mode's speed range, plus a dwell at each
 * stop it passes, rounded out to whole steps. Never under one step, and never a single number.
 */
export function estimateTravel(vehicle: Vehicle, metres: number, stops: number): TravelEstimate {
  const km = Math.max(0, metres) / 1000;
  const { slow, fast } = TRAVEL_SPEED_KMH[vehicle];
  const dwell = Math.max(0, stops) * DWELL_MINUTES_PER_STOP[vehicle];
  const step = ESTIMATE_STEP_MINUTES;
  const low = Math.max(step, Math.floor(((km / fast) * 60 + dwell) / step) * step);
  const high = Math.max(low + step, Math.ceil(((km / slow) * 60 + dwell) / step) * step);
  return { low, high };
}

/** The estimate as the time pill writes it: "~30–60 min". */
export function travelLabel({ low, high }: TravelEstimate): string {
  return `~${low}–${high} min`;
}

/** …and as a screen reader hears it: "About 30 to 60 minutes, an estimate". */
export function travelSpoken({ low, high }: TravelEstimate): string {
  return `About ${low} to ${high} minutes, an estimate`;
}

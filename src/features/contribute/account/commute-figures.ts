import type { Figure } from '../common/format';

/** Whole numbers with thousands separators, the same on every phone: `1,240`. */
const WHOLE = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Time on the road, moving and standing: whole hours from an hour up, else whole minutes. */
export function totalTimeFigure(seconds: number): Figure {
  const whole = Math.max(0, Math.floor(seconds));
  return whole < 3600
    ? { value: WHOLE.format(Math.floor(whole / 60)), unit: 'min' }
    : { value: WHOLE.format(Math.floor(whole / 3600)), unit: 'hr' };
}

/** Distance recorded, in whole kilometres with thousands separators: `1,240 km`. */
export function totalDistanceFigure(metres: number): Figure {
  return { value: WHOLE.format(Math.floor(Math.max(0, metres) / 1000)), unit: 'km' };
}

/** The recordings' words, as the owner names them: one Route recorded, else Routes recorded. */
export const routeRecordingsLabel = (count: number): string =>
  count === 1 ? 'Route recorded' : 'Routes recorded';

/** Pesos with thousands separators, and centavos only when there are some: `1,240` or `1,240.50`. */
const PESOS = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const PESOS_AND_CENTAVOS = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** The Total fare card's figure, as shown and as a screen reader says it. */
export interface FareFigure {
  shown: string;
  spoken: string;
}

/**
 * The fares paid, over the rides that said what they cost: `₱129`, or `₱1,240.50` with centavos.
 * With no ride saying its fare it reads `--` ("none"), not `₱0`: nothing is known yet.
 */
export function totalFareFigure(farePhpTotal: number, fareRecordings: number): FareFigure {
  if (fareRecordings <= 0) return { shown: '--', spoken: 'none' };
  // Whole centavos, so a sum's float noise never shows as centavos.
  const centavos = Math.round(Math.max(0, farePhpTotal) * 100);
  const pesos =
    centavos % 100 === 0 ? PESOS.format(centavos / 100) : PESOS_AND_CENTAVOS.format(centavos / 100);
  return { shown: `₱${pesos}`, spoken: `${pesos} pesos` };
}

/** How the distance splits between riding and walking, each a whole percent; null with none. */
export interface ModeSplit {
  sakayPercent: number;
  lakadPercent: number;
}

/**
 * Sakay and Lakad by distance. Rides saved before the walk and ride split are in neither walkM nor
 * rideM; they count as Sakay, every one a ride then, so Sakay is all that is not walked.
 */
export function modeSplit(distanceM: number, walkM: number): ModeSplit | null {
  if (distanceM <= 0) return null;
  const lakadPercent = Math.round((Math.min(Math.max(walkM, 0), distanceM) / distanceM) * 100);
  return { sakayPercent: 100 - lakadPercent, lakadPercent };
}

/** A vehicle's ride count in the grid: `--` for none, as the frame has it, else with separators. */
export function vehicleRidesFigure(rides: number): string {
  return rides <= 0 ? '--' : WHOLE.format(rides);
}

/** The most a fare may be, as the database checks it: numeric(7,2), 0 to 2000. */
export const FARE_PHP_MAX = 2000;

/**
 * The fare as it goes up: in whole centavos, or null when it is not a number from 0 to
 * FARE_PHP_MAX. The database refuses a fare out of range, and with it the whole ride; a fare
 * it would refuse is left out instead, so the ride still goes.
 */
export function uploadedFare(farePhp: number | null | undefined): number | null {
  if (typeof farePhp !== 'number' || !Number.isFinite(farePhp)) return null;
  const centavos = Math.round(farePhp * 100);
  if (centavos < 0 || centavos > FARE_PHP_MAX * 100) return null;
  return centavos / 100;
}

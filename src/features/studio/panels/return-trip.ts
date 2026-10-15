import type { DirectionRow } from '@/features/routes/model/routes';

/**
 * After a save, whether the route still has a way undrawn, so the saved toast
 * may offer "Draw the return trip". The direction just saved counts as drawn
 * whatever the list says until its reload lands: the offer once started a
 * drawing whose save replaced the other direction's line (review finding 2).
 */
export function returnTripLeft(
  justSaved: DirectionRow | null,
  directions: readonly DirectionRow[],
): boolean {
  if (!justSaved) return false;
  return directions.some(
    (v) => v.routeId === justSaved.routeId && v.id !== justSaved.id && v.shape === null,
  );
}

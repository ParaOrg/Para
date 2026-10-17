import type { DirectionRow } from '@/features/routes/model/routes';

/**
 * After a save, whether the route still has a way undrawn, so the saved toast
 * may offer "Draw the return trip". The direction just saved counts as drawn
 * whatever the list says until its reload lands: otherwise the offer could
 * start a drawing whose save replaces the other direction's line.
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

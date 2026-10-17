/*
 * Where a ride lies on a trip's timeline rows: pure functions over rows, with
 * no geometry (the ride on the line is ride.ts's).
 */

/**
 * The rows of a trip's timeline outside its ride: outside the stretch between
 * the start's row and the end's, whichever is above. A null start is the
 * origin; with no end, no ride, and nothing outside it. The card folds these
 * rows, its rail broken where the ride starts and ends (the owner's Variant5,
 * 4151:13619), and the map's dots along them wear the pale.
 */
export function rowsOutsideRide(
  rows: readonly { id: string }[],
  startId: string | null,
  endId: string | null,
  endRow: 'from' | 'to' | null = null,
): Set<string> {
  const ride = rideRows(rows, startId, endId, endRow);
  if (!ride) return new Set();
  return new Set(rows.filter((_, i) => i < ride.first || i > ride.last).map((r) => r.id));
}

/**
 * The rows of a trip's timeline outside a start picked alone: every row but
 * the start's. With no end there is no ride yet, so the whole trip is drawn
 * on the pale and only the start stands out.
 */
export function rowsOutsideStartAlone(
  rows: readonly { id: string }[],
  startId: string,
): Set<string> {
  return new Set(rows.filter((r) => r.id !== startId).map((r) => r.id));
}

/**
 * Where a picked ride lies on a trip's timeline: its first row and its last,
 * whichever of the start and the end is above (an end tapped above the start
 * stays the end, ridden back along the line: rideSpan). -1 is the origin, a
 * start left there. Null with no end picked — nothing, or a start alone, no
 * ride yet until its end is picked (the owner's Variant3: the S stands alone,
 * so a start alone does not read as a ride) — or with a pick that is no row
 * of these (another trip's, a moment before it goes): the whole ride.
 * `endRow`, an end row picked with the start kept (rideToEnd): the ride from
 * the start's row to the destination, the row count, or back to the origin,
 * -1. The one rule the card's rail and folds read (rowsOutsideRide).
 */
export function rideRows(
  rows: readonly { id: string }[],
  startId: string | null,
  endId: string | null,
  endRow: 'from' | 'to' | null = null,
): { first: number; last: number } | null {
  const startAt = startId === null ? -1 : rows.findIndex((r) => r.id === startId);
  if (startId !== null && startAt < 0) return null;
  if (endId === null) {
    if (endRow === null || startId === null) return null;
    return endRow === 'to' ? { first: startAt, last: rows.length } : { first: -1, last: startAt };
  }
  const endAt = rows.findIndex((r) => r.id === endId);
  if (endAt < 0) return null;
  return startAt <= endAt ? { first: startAt, last: endAt } : { first: endAt, last: startAt };
}

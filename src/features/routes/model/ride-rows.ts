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
  isLoop = false,
): Set<string> {
  const ride = rideRows(rows, startId, endId, endRow, isLoop);
  if (!ride) return new Set();
  // A wrapped ride runs from the start down to the bottom and on from the top
  // to the end: what it leaves out is the rows strictly between the end and the start.
  if (ride.wraps)
    return new Set(rows.filter((_, i) => i > ride.last && i < ride.first).map((r) => r.id));
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
 *
 * On a loop (`isLoop`) the rows are what lies between its tip at the top and
 * the tip again at the bottom, and a ride only goes forward, round: an
 * `endRow` of 'from' is the same row as 'to', the tip, and an end above the
 * start wraps — `first` is the start's row, `last` the end's above it, and
 * `wraps` is true: the ride runs from the start to the bottom and on from the
 * top to the end.
 */
export function rideRows(
  rows: readonly { id: string }[],
  startId: string | null,
  endId: string | null,
  endRow: 'from' | 'to' | null = null,
  isLoop = false,
): { first: number; last: number; wraps?: true } | null {
  const startAt = startId === null ? -1 : rows.findIndex((r) => r.id === startId);
  if (startId !== null && startAt < 0) return null;
  if (endId === null) {
    if (endRow === null || startId === null) return null;
    if (isLoop || endRow === 'to') return { first: startAt, last: rows.length };
    return { first: -1, last: startAt };
  }
  const endAt = rows.findIndex((r) => r.id === endId);
  if (endAt < 0) return null;
  if (isLoop && endAt < startAt) return { first: startAt, last: endAt, wraps: true };
  return startAt <= endAt ? { first: startAt, last: endAt } : { first: endAt, last: startAt };
}

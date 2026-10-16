import { rowsOutsideRide } from '../model/ride';

/**
 * A fold of a trip's timeline (TimelineRouteDetail): `all`, every hintuan,
 * with nothing picked; once a start or an end is picked, `before`, the rows
 * before the ride, and `after`, the rows after it (after a start alone, the
 * rows after it).
 */
export type FoldPart = 'all' | 'before' | 'after';

export interface TimelineFold {
  part: FoldPart;
  /** Its rows, in the timeline's order. The fold's own row sits after the last of them. */
  rowIds: readonly string[];
}

/**
 * Which of a trip's rows fold, and into which fold. With nothing picked,
 * every hintuan folds into one row, as it always has. Once a start or an end
 * is picked, the rows outside the ride fold and the ride's own rows stay
 * open (the owner, 2026-10-15): the rows before it into a fold just above
 * it, and the rows after it into a fold just above the destination, where
 * his Variant4 and Choosing draw them. A start alone is no ride yet
 * (2026-10-16) and folds as the end it was a moment before, on Choosing:
 * the rows above it open, the rows after it folded above the destination,
 * where his Variant3 draws them, so Set as start moves nothing. A lone row
 * is shown as it is, with nothing to fold (Claude's call of 2026-09-29,
 * kept).
 */
export function timelineFolds(
  rows: readonly { id: string }[],
  startId: string | null,
  endId: string | null,
): TimelineFold[] {
  const fold = (part: FoldPart, rowIds: string[]): TimelineFold[] =>
    rowIds.length > 1 ? [{ part, rowIds }] : [];
  const ids = rows.map((r) => r.id);
  if (startId === null && endId === null) return fold('all', ids);
  const outside =
    endId === null ? rowsOutsideRide(rows, null, startId) : rowsOutsideRide(rows, startId, endId);
  const firstIn = ids.findIndex((id) => !outside.has(id));
  if (firstIn < 0) return fold('all', ids);
  return [
    ...fold('before', ids.slice(0, firstIn)),
    ...fold(
      'after',
      ids.slice(firstIn).filter((id) => outside.has(id)),
    ),
  ];
}

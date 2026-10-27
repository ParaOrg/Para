import { rowsOutsideRide } from '../model/ride-rows';

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
 * open: the rows before it into a fold just above it, and the rows after it
 * into a fold just above the destination, where Figma's Variant4 and Choosing
 * draw them. A start alone is no ride yet and folds as the end it was a
 * moment before, on Choosing: the rows above it open, the rows after it
 * folded above the destination, where Variant3 draws them, so Set as start
 * moves nothing. An end row picked with the start kept is the ride's end
 * (rideRows' `endRow`). A lone row is shown as it is, with nothing to fold.
 *
 * On a loop a ride can wrap, from its start down to the bottom and on from the
 * top to its end: the rows outside it are then the ones between, one fold
 * under the name `after`, just above the start.
 */
export function timelineFolds(
  rows: readonly { id: string }[],
  startId: string | null,
  endId: string | null,
  endRow: 'from' | 'to' | null = null,
  isLoop = false,
): TimelineFold[] {
  const fold = (part: FoldPart, rowIds: string[]): TimelineFold[] =>
    rowIds.length > 1 ? [{ part, rowIds }] : [];
  const ids = rows.map((r) => r.id);
  if (startId === null && endId === null) return fold('all', ids);
  const isStartAlone = endId === null && endRow === null;
  const outside = isStartAlone
    ? rowsOutsideRide(rows, null, startId, null, isLoop)
    : rowsOutsideRide(rows, startId, endId, endRow, isLoop);
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

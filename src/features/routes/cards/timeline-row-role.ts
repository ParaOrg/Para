import type { RouteTripLineDetailPillContent } from './route-trip-line-detail-pill';
import type { RailReach } from './timeline-rail';
import type { TimelineStickConnection, TimelineStickVariant } from './timeline-stick';

/** Where a ride starts (Start's S) or ends (End's E), before a row's name. */
export type RideMarkKind = 'start' | 'end';

/** An end of the trip, picked from its row: the origin (`from`) or the destination (`to`). */
export type EndRow = 'from' | 'to';

/** A row's part in the ride: its S or E, its pill, and the button under it. */
export interface RowRole {
  mark: RideMarkKind | null;
  pill: RouteTripLineDetailPillContent | null;
  action: { label: string; isRemove: boolean; onTap: () => void } | null;
}

export interface RowRoleInput {
  isStart: boolean;
  isEnd: boolean;
  hasStart: boolean;
  startCode: string | null;
  pickedCode: string | null;
  pickedPesos?: string;
  onSetStart?: () => void;
  onRemoveStart?: () => void;
}

/**
 * What a hintuan's row wears for the picks: the start's row its S and ×
 * Remove as start under it; the end's its E, and Set as start under it while
 * no start is picked (Choosing); any other row, nothing. The start's pill says
 * its station's code alone, and the end's its code and the ride's pesos: a
 * jeep's start, with no code, has none, and a ride with no fare no pill on its
 * end.
 */
export function rowRole(row: RowRoleInput): RowRole {
  const priced = (code: string | null) =>
    row.pickedPesos ? { code, pesos: row.pickedPesos } : null;
  if (row.isStart) {
    return {
      mark: 'start',
      pill: row.startCode === null ? null : { code: row.startCode },
      action: row.onRemoveStart
        ? { label: 'Remove as start', isRemove: true, onTap: row.onRemoveStart }
        : null,
    };
  }
  if (row.isEnd) {
    return {
      mark: 'end',
      pill: priced(row.pickedCode),
      action:
        !row.hasStart && row.onSetStart
          ? { label: 'Set as start', isRemove: false, onTap: row.onSetStart }
          : null,
    };
  }
  return { mark: null, pill: null, action: null };
}

/**
 * What the origin's row wears: Start's S while no start is picked further
 * on; End's E when, a start picked, it is the ride's end, tapped with the
 * start kept; else nothing.
 */
export function originMark(start: string | null, endPicked: EndRow | null): RideMarkKind | null {
  if (start === null) return 'start';
  return endPicked === 'from' ? 'end' : null;
}

/**
 * An end of the trip picked as the ride's end, with a start: its pill, as a
 * hintuan end's, its station's code and the ride's pesos. Null with no
 * start, or no fare.
 */
export function endRowPill(
  start: string | null,
  pickedCode: string | null,
  pickedPesos: string | undefined,
): RouteTripLineDetailPillContent | null {
  return start !== null && pickedPesos ? { code: pickedCode, pesos: pickedPesos } : null;
}

/**
 * A hintuan row's piece of the rail, from whether the rail runs on above its
 * dot and below it: a row the rail neither reaches nor leaves is its dot alone.
 */
export function railPiece({ hasAbove, hasBelow }: RailReach): {
  connection: TimelineStickConnection;
  piece: TimelineStickVariant;
} {
  if (hasAbove && hasBelow) return { connection: 'connected', piece: 'middle' };
  if (hasBelow) return { connection: 'connected', piece: 'middleTop' };
  if (hasAbove) return { connection: 'connected', piece: 'middleBottom' };
  return { connection: 'disconnected', piece: 'middle' };
}

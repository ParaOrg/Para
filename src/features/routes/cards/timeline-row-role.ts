import type { RouteStopSignKind } from './route-stop-sign';
import type { RouteTripLineDetailPillContent } from './route-trip-line-detail-pill';

/** Where a ride starts (Start's S) or ends (End's E), in its row's slot. */

/** An end of the trip, picked from its row: the origin (`from`) or the destination (`to`). */
export type EndRow = 'from' | 'to';

/** A row's part in the ride: its S or E, its pill, and the button under it. */
export interface RowRole {
  mark: RouteStopSignKind | null;
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
 * jeep's start, with no code, has none, and a ride with no fare no pill on
 * its end.
 */
export function rowRole(row: RowRoleInput): RowRole {
  // Priced, its code and the pesos; unpriced, a station's code alone (T1).
  const priced = (code: string | null): RouteTripLineDetailPillContent | null => {
    if (row.pickedPesos) return { code, pesos: row.pickedPesos };
    return code === null ? null : { code };
  };
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
export function originMark(
  start: string | null,
  endPicked: EndRow | null,
): RouteStopSignKind | null {
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

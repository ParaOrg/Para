import type { FoldPart, TimelineFold } from './timeline-folds';

/** Where a row of a trip's timeline lies against the ride picked on it. */
type Side = 'before' | 'ride' | 'after';

/** One row's piece of the rail: whether it runs on above its dot and below it. */
export interface RailReach {
  hasAbove: boolean;
  hasBelow: boolean;
}

/** The rail along a trip's timeline (TimelineRouteDetail), row by row. */
export interface TimelineRail {
  /** Whether the rail leaves the origin's dot downwards. */
  originHasBelow: boolean;
  /** Each hintuan row's piece, in the timeline's order. */
  rows: RailReach[];
  /** Whether the rail runs through a fold's row. */
  foldHasRail: (part: FoldPart) => boolean;
  /** Whether the rail reaches the destination's dot from above. */
  destinationHasAbove: boolean;
}

/** One thing on the timeline the rail can run through, in order: an end, a row or a fold's row. */
interface Stop {
  /** Its side of the ride; null for a fold's row by the ride, which carries no rail. */
  side: Side | null;
  isShown: boolean;
  fold?: FoldPart;
}

/**
 * The rail along a trip's timeline, from the rows the ride covers (`ride`:
 * its first row and its last, -1 the origin and the row count the
 * destination; with nothing picked, the whole trip) and its folds.
 *
 * The rail joins two things next to each other on the card when both are
 * on the same side of the ride: along the ride, and along the rows before
 * it and after it, broken where the ride starts and where it ends (the
 * owner's Variant5, 4151:13619, 2026-10-16: "can you still connect those
 * dots"). A fold's row next to the ride carries no rail, open or closed
 * (the owner, 2026-10-16: "when close it should disconnect the disclosure",
 * 4194:12562 and 4194:12702): the `before` fold's row always sits just
 * above the ride, and the `after` fold's, closed, just below it, the
 * destination's dot then alone. Opened, the `after` fold's row sits
 * between its last row and the destination, both after the ride, and the
 * rail runs through it (4189:11483); the `all` fold, nothing picked, is
 * inside the ride and carries it too.
 *
 * A row folded away wears the rail it wears open, so it folds shut as it
 * was drawn.
 */
export function timelineRail(
  rowIds: readonly string[],
  ride: { first: number; last: number },
  folds: readonly TimelineFold[],
  isOpen: (part: FoldPart) => boolean,
): TimelineRail {
  const shown = reaches(stopsOf(rowIds, ride, folds, isOpen));
  const opened = reaches(stopsOf(rowIds, ride, folds, () => true));
  const rowAt = (stops: { stop: Stop; reach: RailReach }[]) =>
    stops.filter(({ stop }) => stop.fold === undefined).slice(1, -1);
  const shownRows = rowAt(shown);
  const openedRows = rowAt(opened);
  return {
    originHasBelow: shown[0].reach.hasBelow,
    rows: shownRows.map(({ stop, reach }, i) => (stop.isShown ? reach : openedRows[i].reach)),
    foldHasRail: (part) => shown.some(({ stop }) => stop.fold === part && stop.side !== null),
    destinationHasAbove: shown[shown.length - 1].reach.hasAbove,
  };
}

/** The origin, every row with each fold's row after its last, and the destination. */
function stopsOf(
  rowIds: readonly string[],
  ride: { first: number; last: number },
  folds: readonly TimelineFold[],
  isOpen: (part: FoldPart) => boolean,
): Stop[] {
  const sideOf = (i: number): Side => {
    if (i < ride.first) return 'before';
    if (i > ride.last) return 'after';
    return 'ride';
  };
  const stops: Stop[] = [{ side: sideOf(-1), isShown: true }];
  rowIds.forEach((id, i) => {
    const fold = folds.find((f) => f.rowIds.includes(id));
    stops.push({ side: sideOf(i), isShown: !fold || isOpen(fold.part) });
    if (!fold || fold.rowIds.at(-1) !== id) return;
    // The fold's row sits after its last row, and every row of a fold is on
    // one side of the ride. Above it, its last row when open, or the row
    // before its first when closed; below it, the row after its last.
    const above = isOpen(fold.part) ? i : rowIds.indexOf(fold.rowIds[0]) - 1;
    const isByTheRide = sideOf(above) !== sideOf(i + 1);
    stops.push({ side: isByTheRide ? null : sideOf(i), isShown: true, fold: fold.part });
  });
  stops.push({ side: sideOf(rowIds.length), isShown: true });
  return stops;
}

/** Each stop's reach: the rail runs between two stops shown next to each other on one side. */
function reaches(stops: Stop[]): { stop: Stop; reach: RailReach }[] {
  const onCard = stops.filter((s) => s.isShown);
  const joins = (a: Stop | undefined, b: Stop | undefined) =>
    a !== undefined && b !== undefined && a.side !== null && a.side === b.side;
  return stops.map((stop) => {
    const at = onCard.indexOf(stop);
    return {
      stop,
      reach: {
        hasAbove: at >= 0 && joins(stop, onCard[at - 1]),
        hasBelow: at >= 0 && joins(stop, onCard[at + 1]),
      },
    };
  });
}

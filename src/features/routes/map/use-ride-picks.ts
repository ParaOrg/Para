import { useCallback, useState } from 'react';

import type { Direction } from '../model/routes';

/** A row picked on one direction: a pick belongs to its ride. */
interface RowPick {
  directionId: string;
  rowId: string;
}

/**
 * A trip's picks, each kept with the direction it was made on (useRideTo):
 * the hintuan picked as the ride's end, the end of the trip picked from its
 * row, and the hintuan made the ride's start. A different direction, or the
 * same one opened again, starts whole; a jeep's SWITCH sets the picks on the
 * way back before it turns (useRideTo's carryTo), so they are kept.
 */
export function useRidePicks(selected: Direction | null) {
  // Which direction the pick was made on: a pick belongs to its ride, so the
  // first render of another one — a new trip, a train's SWITCH — never cuts
  // its line at the old row. A jeep's SWITCH carries it over (carryTo).
  const [picked, setPicked] = useState<RowPick | null>(null);
  const live = picked && picked.directionId === selected?.id ? picked : null;

  // An end of the trip, picked from its row: the line stays whole, its dot
  // picked like a hintuan's. One pick at a time with the hintuans; kept by
  // direction, as a pick is.
  const [atEnd, setAtEnd] = useState<{ directionId: string; end: 'from' | 'to' } | null>(null);
  const endPicked = selected && atEnd?.directionId === selected.id ? atEnd.end : null;

  // A hintuan made the ride's start by Set as start (the owner's
  // TimelineRouteDetail): the ride runs from it, not from where the direction
  // leaves, to the hintuan picked as its end; alone, it is no ride yet
  // (Variant3). Kept by direction, as the end's pick is.
  const [start, setStartPick] = useState<RowPick | null>(null);
  const liveStart = start && start.directionId === selected?.id ? start : null;

  // A different direction is a different ride, and so is the same one opened
  // again: start it whole. The picks are let go in the render that opens it
  // (the previous id kept to tell), all but one carried over a jeep's
  // SWITCH, which already names the direction it belongs to (carryTo).
  const [rideId, setRideId] = useState(selected?.id);
  if (rideId !== selected?.id) {
    setRideId(selected?.id);
    setPicked((p) => (p?.directionId === selected?.id ? p : null));
    setAtEnd((e) => (e?.directionId === selected?.id ? e : null));
    setStartPick((s) => (s?.directionId === selected?.id ? s : null));
  }

  const selectedId = selected?.id;
  const liveRow = live?.rowId ?? null;

  /**
   * Set as start, under the picked hintuan's row (the owner's Choosing and
   * Variant3): it becomes the ride's start, standing alone until another row
   * is tapped as the end.
   */
  const setStart = useCallback(() => {
    if (!selectedId || liveRow === null) return;
    setStartPick({ directionId: selectedId, rowId: liveRow });
    setPicked(null);
  }, [selectedId, liveRow]);

  /** × Remove as start: the ride leaves where the direction does again. */
  const removeStart = useCallback(() => setStartPick(null), []);

  return {
    /** The hintuan picked as the ride's end on this direction, or null. */
    live,
    /** The hintuan made the ride's start on this direction, or null. */
    liveStart,
    /** The end of the trip picked from its row on this direction, or null. */
    endPicked,
    setPicked,
    setAtEnd,
    setStartPick,
    setStart,
    removeStart,
  };
}

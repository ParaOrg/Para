import { useState } from 'react';

import type { SheetHeight } from '@/shared/ui/bottom-sheet';
import type { Snap } from '@/shared/ui/sheet-gesture';

import { TRIP_OPENS_AT, heightAfterLineTap, sharedSnap } from '../cards/card-stack';

interface Open {
  /** A trip is up. */
  trip: boolean;
  /** A place's card is up. */
  place: boolean;
  /** The route list is up, or kept behind a trip picked from it. */
  choosing: boolean;
  /** How many times a route's line has been tapped: each takes the card it brings up to the middle. */
  lineTaps: number;
}

/**
 * The one height the sheets that stand in for one another share (sharedSnap): with none open it
 * rests at the first card's (`setIdle`); a trip a tap opens — on the list's RouteCard
 * (`openTripFromList`) or on a line of one route — opens at the middle (TRIP_OPENS_AT), and so
 * does any card a route's line tapped brings up, from wherever the sheet stood
 * (heightAfterLineTap); ‹ back from a trip gives the list the height it had; anything else keeps
 * it.
 */
export function useSharedHeight({ trip, place, choosing, lineTaps }: Open) {
  const [snap, setSnap] = useState<Snap>('low');
  const [idle, setIdle] = useState<Snap>('low');
  // The list's own height while a trip picked from it is up.
  const [listSnap, setListSnap] = useState<Snap | null>(null);
  const [wasOpen, setWasOpen] = useState(false);
  const anyOpen = trip || place || choosing;
  const resting = sharedSnap(snap, anyOpen, idle);
  if (resting !== snap) setSnap(resting);
  if (anyOpen !== wasOpen) {
    setWasOpen(anyOpen);
    if (anyOpen && trip && !choosing) setSnap(TRIP_OPENS_AT);
  }
  if (listSnap !== null && !trip && !place) {
    setListSnap(null);
    if (choosing) setSnap(listSnap);
  }
  // After the list's own height is given back: a line's tap, in the same render, wins over it.
  const [seenLineTaps, setSeenLineTaps] = useState(lineTaps);
  if (lineTaps !== seenLineTaps) {
    setSeenLineTaps(lineTaps);
    const middle = heightAfterLineTap(trip, choosing);
    if (middle !== null) setSnap(middle);
  }
  const height: SheetHeight = { snap, onSnap: setSnap };
  return {
    snap,
    height,
    setIdle,
    openTripFromList: () => {
      setListSnap(snap);
      setSnap(TRIP_OPENS_AT);
    },
  };
}

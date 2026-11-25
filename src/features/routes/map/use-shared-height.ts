import { useState } from 'react';

import type { SheetHeight } from '@/shared/ui/bottom-sheet';
import type { Snap } from '@/shared/ui/sheet-gesture';

import { TRIP_OPENS_AT, sharedSnap } from '../cards/card-stack';

interface Open {
  /** A trip is up. */
  trip: boolean;
  /** A place's card is up. */
  place: boolean;
  /** The route list is up, or kept behind a trip picked from it. */
  choosing: boolean;
}

/**
 * The one height the sheets that stand in for one another share (sharedSnap), by the owner's rules
 * of 2026-11-25: with none open it rests at the first card's (`setIdle`); a trip a tap opens — on
 * the list's RouteCard (`openTripFromList`) or on a line of one route — opens at the middle
 * (TRIP_OPENS_AT); ‹ back from it gives the list the height it had; anything else keeps it.
 */
export function useSharedHeight({ trip, place, choosing }: Open) {
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

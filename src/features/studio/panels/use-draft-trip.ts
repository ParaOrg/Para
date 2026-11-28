import { useState } from 'react';

import type { DirectionRow } from '@/features/routes/model/routes';

/** A route that is a draft only, open in the route line detail from its draft (useOpenDraft). */
export interface DraftTrip {
  direction: DirectionRow;
  /** The directions of the routes that are drafts only: the detail's tabs and destinations. */
  directions: readonly DirectionRow[];
  /** Another of them in this one's place. */
  show: (direction: DirectionRow) => void;
  close: () => void;
}

interface UseDraftTripOptions {
  /** The directions of routes that are drafts only (useDraftOnly). */
  draftDirections: readonly DirectionRow[];
  /** An approved route's or a hotspot's card is open (useCardStack). */
  isCardOpen: boolean;
  isDrawing: boolean;
  isWideScreen: boolean;
}

/**
 * Which draft-only route's detail is open, by its direction: `trip` to show, `open` to set one.
 * A card opened over it takes its place for good, so closing that card leaves the map, not this
 * draft; so do a drawing and a window narrowed to a phone's, which hide it with no Escape or tap
 * to have closed it meanwhile.
 */
export function useDraftTrip({
  draftDirections,
  isCardOpen,
  isDrawing,
  isWideScreen,
}: UseDraftTripOptions) {
  const [tripId, setTripId] = useState<string | null>(null);
  const [wasCardOpen, setWasCardOpen] = useState(isCardOpen);
  if (isCardOpen !== wasCardOpen) {
    setWasCardOpen(isCardOpen);
    if (isCardOpen) setTripId(null);
  }
  if (tripId !== null && (isDrawing || !isWideScreen)) setTripId(null);
  const direction = draftDirections.find((v) => v.id === tripId);
  const trip: DraftTrip | null = direction
    ? {
        direction,
        directions: draftDirections,
        show: (v) => setTripId(v.id),
        close: () => setTripId(null),
      }
    : null;
  return { trip, open: setTripId };
}

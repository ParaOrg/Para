import { useState } from 'react';

import { liveryOf, type Livery } from '../model/liveries';
import type { Direction } from '../model/routes';

/**
 * The trip's colour, one owner for it: decided as the trip opens — the RouteCard's it was picked
 * from, in the list or a hotspot's card, while that card stands behind it (a card of several routes
 * wears its first row's), else its own (liveryOf) — and kept until it closes, through turning the way round and even
 * when a tap on its own line closes the list behind it: a card never changes colour while it is
 * open. Its line wears it too, so the page reads it, not the card. Settled while rendering, as
 * derived state is, so the card never shows a frame in the wrong colour.
 */
export function useTripLivery(
  open: Direction | null,
  worn: { id: string; livery: Livery } | null,
  wornBehind: boolean,
): Livery | null {
  const [tripWears, setTripWears] = useState<{ routeId: string; livery: Livery } | null>(null);
  let tripLivery = open && tripWears?.routeId === open.routeId ? tripWears.livery : null;
  if (open && !tripLivery) {
    tripLivery = (wornBehind && worn?.id === open.id ? worn.livery : undefined) ?? liveryOf(open);
    setTripWears({ routeId: open.routeId, livery: tripLivery });
  } else if (!open && tripWears) {
    setTripWears(null);
  }
  return tripLivery;
}

import { useState } from 'react';

interface RideHighlight {
  /** The upload the ride belongs to. */
  id: string | null;
  /** The ride's trail part, or null for none. */
  piece: number | null;
}

/**
 * Which ride of the opened upload is highlighted on the map, by its trail
 * part: another upload opened starts with none, and closing one clears it.
 */
export function useRideHighlight(openedId: string | null) {
  const [highlight, setHighlight] = useState<RideHighlight>({ id: null, piece: null });
  return {
    highlightedPiece: highlight.id === openedId ? highlight.piece : null,
    highlightRide: (piece: number | null) => setHighlight({ id: openedId, piece }),
    clearRideHighlight: () => setHighlight({ id: null, piece: null }),
  };
}

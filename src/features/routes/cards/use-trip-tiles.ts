import { useState } from 'react';

import type { Fare } from './trip-fare';

interface TripTilesInput {
  /** The whole ride's length, and the fare for it (omitted when unpriced). */
  metres: number;
  fare?: Fare;
  /** …and the ride between the picks. */
  pickedMetres?: number;
  pickedFare?: Fare;
  /** Whether a ride is picked: an end, or a start with an end. A start alone is no ride yet. */
  hasRide: boolean;
  /** The fare kind the app keeps for every trip (useFareKind); without it, the trip keeps its own. */
  discounted?: boolean;
  onDiscounted?: (discounted: boolean) => void;
}

interface TripTiles {
  /** The fare and the length the tiles show: the picked ride's once there is one, else the whole. */
  shown: Fare | undefined;
  shownMetres: number;
  isDiscounted: boolean;
  /** How many times ↻ has turned: counted, so the next tap turns it on rather than back. */
  turns: number;
  /** The fare tile tapped: the other fare, Regular or Discounted. */
  onTurn: () => void;
}

/**
 * What a trip's Distance and fare tiles show (TripTiles). With a ride picked, both read it, from
 * where the trip leaves to the pick, or from the start to the end once both are picked; let go, the
 * whole ride again. A tap on the fare tile turns it to the other fare, kept for every trip after and
 * the next visit by the app (useFareKind); a first visit, and a story, open on Regular. The second
 * fare reads "Discounted fare" on purpose, though Figma's Default variant names a layer "Student
 * fare" (3807:5510).
 */
export function useTripTiles({
  metres,
  fare,
  pickedMetres,
  pickedFare,
  hasRide,
  discounted: kept,
  onDiscounted,
}: TripTilesInput): TripTiles {
  const [own, setOwn] = useState(false);
  const [turns, setTurns] = useState(0);
  const isDiscounted = kept ?? own;
  return {
    shown: hasRide && pickedFare ? pickedFare : fare,
    shownMetres: hasRide && pickedMetres !== undefined ? pickedMetres : metres,
    isDiscounted,
    turns,
    onTurn: () => {
      if (onDiscounted) onDiscounted(!isDiscounted);
      else setOwn(!isDiscounted);
      setTurns((t) => t + 1);
    },
  };
}

import type { ReactNode } from 'react';

import { TimelineRouteDetail, type TimelineRouteDetailProps } from './timeline-route-detail';
import { farePesos, type Fare } from './trip-fare';
import { TripNotes } from './trip-notes';
import { TripSignboards } from './trip-signboards';
import { TripTiles } from './trip-tiles';
import { useTripTiles } from './use-trip-tiles';

export type TripDetailProps = Omit<TimelineRouteDetailProps, 'pickedPesos'> & {
  /** Figma's Distance tile: the whole ride's length, in metres; written `12.8km`. */
  metres: number;
  /** …and the ride between the picks, which the tile shows once an end is picked, as the fare tile does. */
  pickedMetres?: number;
  /** The fare tile's pesos for the whole ride, or FREE. Omitted when unpriced, and the tile with it. */
  fare?: Fare;
  /** …and for the ride between the picks, which the tile shows once an end is picked. */
  pickedFare?: Fare;
  /**
   * Whether the tile shows the Discounted fare, and where a tap says so: the app keeps one for every
   * trip (useFareKind). Without them, the trip keeps its own, opening on Regular, as a story does.
   */
  discounted?: boolean;
  onDiscounted?: (discounted: boolean) => void;
  /** What the trip rides (TripRidePills), at the top of its panel. None, no pill. */
  ridePills?: ReactNode;
  /** The direction's signboards (BottomContent, 4796:30124): SVG files the studio uploaded, in order. None, no card. */
  signboards?: readonly string[];
  /** Under the stops, a line's own fixed words (LINE_NOTES): the ferry's days and where to check for a suspension. */
  note?: string;
  /**
   * Under the stops, first: the walk from the ride's end to a landmark the commuter is going to
   * (ticket 07), "About 300 m to SM North EDSA, in a straight line".
   */
  walk?: string | null;
};

/**
 * A trip's body, under its ends (BottomContent, 4796:30124): what it rides, its signboards, its
 * Distance and fare tiles (useTripTiles), 16 apart and 12 in; then its stops on the sheet's
 * surface (TimelineRouteDetail), their rows 16 in as Figma lays them, and the notes under them. A
 * route no fare rule prices has no fare tile, and Distance takes the row.
 */
export function TripDetail({
  metres,
  pickedMetres,
  fare,
  pickedFare,
  discounted,
  onDiscounted,
  ridePills,
  signboards = [],
  note,
  walk,
  ...stops
}: TripDetailProps) {
  // An end picked: the tiles read the ride to it. A start alone is no ride yet.
  const hasRide =
    stops.picked !== null || ((stops.start ?? null) !== null && stops.endPicked !== null);
  const tiles = useTripTiles({
    metres,
    fare,
    pickedMetres,
    pickedFare,
    hasRide,
    discounted,
    onDiscounted,
  });
  return (
    <>
      <div className="flex w-full flex-col gap-4 px-3 pt-3 pb-4">
        {ridePills}
        <TripSignboards signboards={signboards} />
        <TripTiles
          shown={tiles.shown}
          shownMetres={tiles.shownMetres}
          isDiscounted={tiles.isDiscounted}
          turns={tiles.turns}
          onTurn={tiles.onTurn}
        />
      </div>
      {/* 24 at the foot: the sheet itself pads for the Controller drawn over it (BottomSheet). */}
      <div className="flex w-full flex-col gap-4 pb-6">
        <TimelineRouteDetail
          {...stops}
          pickedPesos={pickedFare && farePesos(pickedFare, tiles.isDiscounted)}
        />
        <TripNotes walk={walk} note={note} />
      </div>
    </>
  );
}

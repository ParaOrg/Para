interface TripNotesProps {
  /**
   * First: the walk from the ride's end to a landmark the commuter is going to, "About 300 m to
   * SM North EDSA, in a straight line".
   */
  walk?: string | null;
  /** A line's own fixed words (LINE_NOTES): the ferry's days and where to check for a suspension. */
  note?: string;
}

/** The words under a trip's stops (TimelineRouteDetailCard): the walk, then the line's note. */
export function TripNotes({ walk, note }: TripNotesProps) {
  return (
    <>
      {walk && (
        <p
          data-testid="trip-walk"
          className="w-full px-3 pb-4 font-sn-pro text-sm/5 text-content-tertiary"
        >
          {walk}
        </p>
      )}
      {note && (
        <p
          data-testid="trip-note"
          className="w-full px-3 pb-4 font-sn-pro text-sm/5 text-content-tertiary"
        >
          {note}
        </p>
      )}
    </>
  );
}

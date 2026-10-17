interface TripSignboardsProps {
  /** Addresses of the SVG files the studio uploaded, in order. */
  signboards: readonly string[];
}

/**
 * Between the card and the tiles, the direction's signboards (Figma strip 4051:5528): a white
 * strip, 12 in from the sides and 16 above, each board 40 tall at its own width, 8 apart, wrapping
 * on a narrow phone (3919:11447). No heading: the boards say what they are. Pictures, so nothing in
 * a file can run. None uploaded, no strip: the tiles sit right under the card. At a sheet's Low the
 * card's top is all that shows (sheetGesture's LOW_PX), so the strip needs no hiding of its own.
 */
export function TripSignboards({ signboards }: TripSignboardsProps) {
  return (
    <ul
      data-testid="trip-signboards"
      aria-label="Signboards"
      className="flex w-full flex-wrap gap-2 bg-surface px-3 pt-4"
    >
      {signboards.map((src, i) => (
        <li key={src}>
          <img
            data-testid="trip-signboard"
            src={src}
            alt={signboards.length > 1 ? `Signboard ${i + 1} of ${signboards.length}` : 'Signboard'}
            className="block h-10 w-auto max-w-full"
            decoding="async"
          />
        </li>
      ))}
    </ul>
  );
}

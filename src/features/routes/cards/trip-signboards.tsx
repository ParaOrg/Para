import { useId } from 'react';

interface TripSignboardsProps {
  /** Addresses of the SVG files the studio uploaded, in order. */
  signboards: readonly string[];
}

/**
 * The direction's signboards on their own card (RouteTripDetail, 4680:25123): "Signboard",
 * SemiBold 18/28, then the boards, each 40 tall at its own width, 8 apart, wrapping on a narrow
 * phone; white, rounded 24, under shadow-large. Pictures, so nothing in a file can run. None
 * uploaded, no card.
 */
export function TripSignboards({ signboards }: TripSignboardsProps) {
  const heading = useId();
  return (
    <section
      data-testid="trip-signboards"
      aria-labelledby={heading}
      className="flex w-full flex-col gap-3 overflow-clip rounded-3xl bg-surface p-4 font-sn-pro shadow-large"
    >
      <h3 id={heading} className="text-lg/7 font-semibold text-content-primary">
        Signboard
      </h3>
      <ul className="flex w-full flex-wrap gap-2">
        {signboards.map((src, i) => (
          <li key={src}>
            <img
              data-testid="trip-signboard"
              src={src}
              alt={
                signboards.length > 1 ? `Signboard ${i + 1} of ${signboards.length}` : 'Signboard'
              }
              className="block h-10 w-auto max-w-full"
              decoding="async"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

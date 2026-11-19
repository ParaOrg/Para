import { useId } from 'react';

interface TripSignboardsProps {
  /** Addresses of the SVG files the studio uploaded, in order. */
  signboards: readonly string[];
}

/**
 * The direction's signboards on their own card (BottomContent, 4796:30124): "Signboard", Bold
 * 18/26, then the boards, each 32 tall at its own width, 8 apart, wrapping on a narrow phone;
 * white, rounded 24, 14 in. Pictures, so nothing in a file can run. None uploaded, no card.
 */
export function TripSignboards({ signboards }: TripSignboardsProps) {
  const heading = useId();
  if (signboards.length === 0) return null;
  return (
    <section
      data-testid="trip-signboards"
      aria-labelledby={heading}
      className="flex w-full flex-col gap-3 overflow-clip rounded-3xl bg-bg-fill p-3.5 font-sn-pro shadow-trip-card"
    >
      <h3 id={heading} className="text-lg/6.5 font-bold text-text-primary">
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
              className="block h-8 w-auto max-w-full"
              decoding="async"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

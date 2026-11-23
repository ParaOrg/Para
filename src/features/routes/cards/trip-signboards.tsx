import { useId } from 'react';

interface TripSignboardsProps {
  /** Addresses of the SVG files the studio uploaded, in order. */
  signboards: readonly string[];
  /**
   * Where the trip goes, for "Going to SM Fairview" under the heading. Absent on a loop, which goes
   * round, not to a place: Figma's Ikot draws no line there (4825:48753).
   */
  routeDirection?: string;
  /** The route's via, for "… via Maligaya"; absent with none. */
  via?: string;
}

/**
 * The direction's signboards on their own card (Signboard, 4822:43834): "Signboard", Bold 16/24,
 * over where the boards say the jeep is going, Regular 12/16; then the boards, each 32 tall at its
 * own width, 8 apart, wrapping on a narrow phone. White, rounded 24, 16 in, sunk under Figma's
 * Signboard shadow. Pictures, so nothing in a file can run. None uploaded, no card.
 */
export function TripSignboards({ signboards, routeDirection, via }: TripSignboardsProps) {
  const heading = useId();
  if (signboards.length === 0) return null;
  return (
    <section
      data-testid="trip-signboards"
      aria-labelledby={heading}
      className="flex w-full flex-col gap-3 overflow-clip rounded-3xl bg-bg-fill p-4 font-sn-pro shadow-signboard"
    >
      <div className="flex w-full flex-col">
        <h3 id={heading} className="text-base-lower/6 font-bold text-text-primary">
          Signboard
        </h3>
        {routeDirection !== undefined && (
          <p className="text-xs/4 text-text-secondary">
            Going to {routeDirection}
            {via !== undefined && ` via ${via}`}
          </p>
        )}
      </div>
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

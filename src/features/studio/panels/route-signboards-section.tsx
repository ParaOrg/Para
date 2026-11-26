import { useId } from 'react';

interface RouteSignboardsSectionProps {
  /** Addresses of the direction's signboard files, in order. */
  signboards: readonly string[];
}

/**
 * The route line detail's Signboard (4905:22960): the boards, 32 tall at their own widths, 12
 * apart, wrapping. With none yet, a line saying where one is added: Edit Route.
 */
export function RouteSignboardsSection({ signboards }: RouteSignboardsSectionProps) {
  const heading = useId();
  return (
    <section aria-labelledby={heading} className="flex w-full flex-col gap-2.5">
      <h3 id={heading} className="text-base-lower/6 font-bold text-text-primary">
        Signboard
      </h3>
      {signboards.length === 0 ? (
        <p className="text-sm/5 text-content-tertiary">No signboard yet — add one in Edit Route</p>
      ) : (
        <ul className="flex w-full flex-wrap gap-3">
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
      )}
    </section>
  );
}

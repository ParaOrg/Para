import { useId } from 'react';

import type { OtherRoute } from '@/features/routes/cards/trip-more-routes';
import { CircleArrowRightIcon } from '@/shared/ui/route-icons';

interface OtherDestinationsProps {
  /** The other routes out of where this direction starts (otherRoutesFrom). None: no section. */
  destinations: readonly OtherRoute[];
  /** A row tapped: that route opens in this one's place. */
  onOpen: (id: string) => void;
}

/**
 * The route line detail's Other destinations (4905:29125): each route out of the same start, its
 * place in Medium 14/20 after a circled arrow, and its via under it in Regular 12/16. A row is a
 * button that opens that route. With none, the section is not drawn.
 */
export function OtherDestinations({ destinations, onOpen }: OtherDestinationsProps) {
  const heading = useId();
  if (destinations.length === 0) return null;
  return (
    <section aria-labelledby={heading} className="flex w-full flex-col gap-3">
      <h3 id={heading} className="text-base-lower/6 font-bold text-text-primary">
        Other destinations
      </h3>
      <ul className="flex w-full flex-col">
        {destinations.map(({ id, to, via }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onOpen(id)}
              className="flex w-full flex-col py-1.5 text-left"
            >
              <span className="flex w-full items-center gap-2 text-sm/5 font-medium text-text-primary">
                <span aria-hidden className="size-4 shrink-0 *:size-full">
                  <CircleArrowRightIcon />
                </span>
                {to}
              </span>
              {via && <span className="text-xs/4 text-text-secondary">Via {via}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

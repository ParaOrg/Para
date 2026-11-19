import { useId, useState, type ReactNode } from 'react';

import { ChevronDownIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { DestinationRow } from './destination-row';
import type { Livery } from '../model/liveries';

export interface OtherRoute {
  id: string;
  /** Where it goes. */
  to: string;
  /** Its route's via, or null with none. */
  via: string | null;
  livery: Livery;
}

interface TripMoreRoutesProps {
  /** The trip's ends (TripEndsCard), on the band at the top. */
  ends: ReactNode;
  /** The other routes out of where the trip starts. None: no tab and no list. */
  routes: readonly OtherRoute[];
  /** A row tapped: that route's trip in this one's place. */
  onRoute: (id: string) => void;
  /** The rest of the trip, on the panel under the band and the list. */
  children: ReactNode;
}

const TAB = {
  closed: 'rounded-b-2xl shadow-tab',
  open: 'rounded-t-2xl shadow-tab-inverse',
} satisfies Record<'closed' | 'open', string>;

/**
 * The top of a trip's detail (RouteDetail, 4796:30411): the band holding its ends, and under it a
 * tab, "View 6 more routes", that opens the other routes out of where the trip starts. Open, the
 * list sits between the band and the panel below, and the tab, "View less", on the panel's top
 * edge. The list stays in the page when closed, hidden, after the band and before the tab, so the
 * tab is one button that keeps its focus as it toggles.
 */
export function TripMoreRoutes({ ends, routes, onRoute, children }: TripMoreRoutesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const headingId = useId();
  const count = routes.length;
  const more = `${count} more ${count === 1 ? 'route' : 'routes'}`;
  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative z-20 w-full bg-bg-surface px-3 pt-3 pb-4 shadow-trip-band sheet-floating:pt-19">
        {ends}
      </div>
      {count > 0 && (
        <section
          id={listId}
          hidden={!isOpen}
          data-testid="trip-other-routes"
          aria-labelledby={headingId}
          className="w-full px-1 font-sn-pro"
        >
          <p
            id={headingId}
            className="px-3 pt-8 pb-2 text-sm/5 font-medium text-text-tertiary uppercase"
          >
            {more}
          </p>
          <ul>
            {routes.map((route) => (
              <li key={route.id}>
                <DestinationRow
                  destination={route.to}
                  additionalNotes={route.via && `via ${route.via}`}
                  livery={route.livery}
                  on="surface"
                  data-testid="trip-other-route"
                  data-direction={route.id}
                  onClick={() => onRoute(route.id)}
                />
              </li>
            ))}
          </ul>
        </section>
      )}
      {count > 0 && (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-controls={listId}
          data-testid="trip-more-routes"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'relative z-10 flex items-center gap-1 bg-bg-surface py-1.5 pr-2.5 pl-3 font-sn-pro text-sm/5 font-medium text-text-secondary',
            isOpen ? cn(TAB.open, '-mb-0.5') : cn(TAB.closed, '-mt-0.5'),
          )}
        >
          {isOpen ? 'View less' : `View ${more}`}
          <span aria-hidden className={cn('flex size-5 *:size-full', isOpen && 'rotate-180')}>
            <ChevronDownIcon />
          </span>
        </button>
      )}
      <div className={cn('w-full bg-bg-surface', isOpen && 'shadow-trip-band-inverse')}>
        {children}
      </div>
    </div>
  );
}

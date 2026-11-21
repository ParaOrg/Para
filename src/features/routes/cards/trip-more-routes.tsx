import { useId, useState, type ReactNode } from 'react';

import { ChevronDownIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { DestinationBar } from './destination-bar';
import { RouteEndPointLines } from './route-end-point-lines';

export interface OtherRoute {
  id: string;
  /** Where it goes. */
  to: string;
  /** Its route's via, or null with none. */
  via: string | null;
}

interface TripMoreRoutesProps {
  /** The trip's ends (TripEndsCard), on the band at the top. */
  ends: ReactNode;
  /** Where the trip starts, which the other routes leave from too: the open list's heading names it. */
  from: string;
  /** The other routes out of where the trip starts. None: no tab and no list. */
  routes: readonly OtherRoute[];
  /** A row tapped: that route's trip in this one's place. */
  onRoute: (id: string) => void;
  /** The rest of the trip, on the panel under the band and the list. */
  children: ReactNode;
}

const TAB = {
  closed: 'rounded-b-2xl pt-2 pb-1.5 shadow-sm',
  open: 'rounded-t-2xl pt-1.5 pb-2 shadow-tab-inverse',
} satisfies Record<'closed' | 'open', string>;

/**
 * The top of a trip's detail (RouteDetail, 4796:30411): the band holding its ends, and under it a
 * tab, "View 6 more destinations", that opens the other routes out of where the trip starts
 * (DestinationGroup), their tree line hanging from the ends card. Open, the list sits between the
 * band and the panel below, and the tab, "View less", tucked under the panel's top edge. The list stays in
 * the page when closed, hidden, after the band and before the tab, so the tab is one button that
 * keeps its focus as it toggles.
 */
export function TripMoreRoutes({ ends, from, routes, onRoute, children }: TripMoreRoutesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();
  const headingId = useId();
  const count = routes.length;
  const more = `${count} more ${count === 1 ? 'destination' : 'destinations'}`;
  return (
    <div className="isolate flex w-full flex-col items-center">
      <div className="relative z-2 w-full bg-bg-surface px-3 pt-3 sheet-floating:pt-19">{ends}</div>
      {count > 0 && (
        <section
          id={listId}
          hidden={!isOpen}
          data-testid="trip-other-routes"
          aria-labelledby={headingId}
          className="w-full bg-bg-surface px-3 font-sn-pro"
        >
          <div className="flex w-full gap-2 pl-3">
            <span className="flex self-stretch text-text-quaternary">
              <RouteEndPointLines position="through" isFaint={false} />
            </span>
            <p
              id={headingId}
              className="min-w-0 flex-1 pt-2.5 pb-1 text-xs/4 font-medium text-text-secondary"
            >
              {more} from {from}
            </p>
          </div>
          <ul>
            {routes.map((route, i) => (
              <li key={route.id}>
                <DestinationBar
                  destination={route.to}
                  additionalNotes={route.via && `via ${route.via}`}
                  variant={i === count - 1 ? 'end' : 'top'}
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
            'relative z-1 flex items-center gap-1 bg-bg-surface pr-2.5 pl-3 font-sn-pro text-sm/5 font-medium text-text-secondary',
            isOpen ? cn(TAB.open, '-mb-0.5') : cn(TAB.closed, '-mt-0.5'),
          )}
        >
          {isOpen ? 'View less' : `View ${more}`}
          <span aria-hidden className={cn('flex size-5 *:size-full', isOpen && 'rotate-180')}>
            <ChevronDownIcon />
          </span>
        </button>
      )}
      {/* Over the tab, so open, the panel's top edge covers the tab's foot (4821:40539). */}
      <div
        className={cn('relative z-2 w-full bg-bg-surface', isOpen && 'shadow-trip-band-inverse')}
      >
        {children}
      </div>
    </div>
  );
}

import { useId } from 'react';

import { RouteEndPointBar } from './route-end-point-bar';
import type { Vehicle } from '../model/vehicles';

export interface OtherRoute {
  id: string;
  to: string;
  vehicle: Vehicle | null;
}

interface TripOtherRoutesProps {
  routes: readonly OtherRoute[];
  /** A row tapped: that route's trip in this one's place. */
  onRoute?: (id: string) => void;
}

/**
 * Figma's "Other routes" under the tiles: a row per other route out of where the trip starts, each
 * by where it goes, as a RouteCard's rows are; a tap opens that route's trip in this one's place.
 */
export function TripOtherRoutes({ routes, onRoute }: TripOtherRoutesProps) {
  const heading = useId();
  return (
    <section
      data-testid="trip-other-routes"
      aria-labelledby={heading}
      className="flex w-full flex-col gap-2 px-3 pt-2 pb-4 font-sn-pro"
    >
      <h3 id={heading} className="text-sm/5 font-medium text-content-tertiary">
        Other routes
      </h3>
      <ul>
        {routes.map((r) => (
          <li key={r.id}>
            <RouteEndPointBar
              routeDirection={r.to}
              vehicle={r.vehicle}
              data-testid="trip-other-route"
              data-direction={r.id}
              onClick={() => onRoute?.(r.id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

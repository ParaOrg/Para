import { cn } from '@/shared/utils/cn';

import { RouteBadge } from './route-badge';
import { ROUTE_BADGE } from './route-card-look';
import { MODE_BADGE_LABEL } from './route-modes';
import { VehicleIcon } from './vehicle-icon';
import type { Livery } from '../model/liveries';
import type { Bound } from '../model/rail-codes';
import type { Vehicle } from '../model/vehicles';

interface RouteStopsCardHeaderProps {
  vehicle: Vehicle;
  /** Which way a train runs, a badge after its line's; null on the road, the ferry, or an unknown bound. */
  bound: Bound | null;
  /** The card it sits on. */
  livery: Livery;
}

/**
 * What a trip rides, atop its stops card (RouteStopsCard, 4681:29139): the vehicle, 24, on a chip,
 * then its RouteBadge at large, and on a train the bound's after it, as a RouteCard's top names
 * them (RouteCardMode). The chip wears the badge's colours, so a light card's is dark as its
 * badges are. The words are the badges'; the drawing is decoration. It takes RouteTripDetailHeader's
 * place, and its test id with it.
 */
export function RouteStopsCardHeader({ vehicle, bound, livery }: RouteStopsCardHeaderProps) {
  return (
    <div data-testid="trip-detail-header" className="flex items-center gap-2 px-3 pt-3.5">
      <span aria-hidden className={cn('flex shrink-0 rounded-lg p-1', ROUTE_BADGE[livery])}>
        <span className="block size-6 *:size-full">
          <VehicleIcon vehicle={vehicle} />
        </span>
      </span>
      <RouteBadge label={MODE_BADGE_LABEL[vehicle]} livery={livery} size="large" />
      {bound && <RouteBadge label={bound} livery={livery} size="large" />}
    </div>
  );
}

import { cn } from '@/shared/utils/cn';

import { RouteBadge } from './route-badge';
import { MODE_BADGE_LABEL } from './route-modes';
import { VehicleIcon } from './vehicle-icon';
import type { Livery } from '../model/liveries';
import type { Bound } from '../model/rail-codes';
import { isRailwayVehicle, type Vehicle } from '../model/vehicles';

interface RouteCardModeProps {
  vehicle: Vehicle;
  /** Which way a train runs, a second badge after its line's; null on the road, the ferry, or an unknown bound. */
  bound: Bound | null;
  /** The card it sits on. */
  livery: Livery;
}

/**
 * What a RouteCard's routes ride, at its top (RouteCard, 4629:22776): the vehicle, 24, in the
 * card's words' colour, then its RouteBadge, and on a train the bound's badge after it. The words
 * are the card's; the drawing is decoration. Figma spaces a train's or the ferry's 6 apart, a road
 * mode's 8.
 */
export function RouteCardMode({ vehicle, bound, livery }: RouteCardModeProps) {
  return (
    <span className={cn('flex items-center', isRailwayVehicle(vehicle) ? 'gap-1.5' : 'gap-2')}>
      <span aria-hidden className="block size-6 shrink-0 *:size-full">
        <VehicleIcon vehicle={vehicle} />
      </span>
      <RouteBadge label={MODE_BADGE_LABEL[vehicle]} livery={livery} />
      {bound && <RouteBadge label={bound} livery={livery} />}
    </span>
  );
}

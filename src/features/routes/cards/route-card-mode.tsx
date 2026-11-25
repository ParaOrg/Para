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
 * What a RouteCard's routes ride, at its top (RouteCard, 4629:22776), in the card's words' colour.
 * A road mode's card shows its vehicle alone, 28 across: the card's list of rows names the mode in
 * words. A train's or the ferry's shows its vehicle, 24, then its line's RouteBadge and, on a
 * train, the bound's, 6 apart. The drawing is decoration.
 */
export function RouteCardMode({ vehicle, bound, livery }: RouteCardModeProps) {
  // The EDSA Carousel's (4895:20962): its bus, 28, then its bound, 8 apart; its mark above says the line.
  if (vehicle === 'EDSA Carousel') {
    return (
      <span className="flex items-center gap-2">
        <span aria-hidden className="block size-7 shrink-0 *:size-full">
          <VehicleIcon vehicle={vehicle} />
        </span>
        {bound && <RouteBadge label={bound} livery={livery} />}
      </span>
    );
  }
  if (!isRailwayVehicle(vehicle)) {
    return (
      <span aria-hidden className="block size-7 shrink-0 *:size-full">
        <VehicleIcon vehicle={vehicle} />
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className="block size-6 shrink-0 *:size-full">
        <VehicleIcon vehicle={vehicle} />
      </span>
      <RouteBadge label={MODE_BADGE_LABEL[vehicle]} livery={livery} />
      {bound && <RouteBadge label={bound} livery={livery} />}
    </span>
  );
}

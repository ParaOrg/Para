import { MODE_CHIP } from './livery-card';
import { MODE_LABEL } from './route-modes';
import { VehicleIcon } from './vehicle-icon';
import type { Livery } from '../model/liveries';
import type { Vehicle } from '../model/vehicles';

interface RouteModeProps {
  vehicle: Vehicle;
  /** The card it sits on: its chip is the card's colours turned inside out (MODE_CHIP). */
  livery: Livery;
}

/**
 * What a card's routes ride, at the card's top (RouteCard, 4629:22776): the vehicle, 36, in the
 * card's words' colour, then its word in Bold 16/24 on a chip (MODE_CHIP), 10 between them. The
 * word is the card's; the drawing beside it is decoration.
 */
export function RouteMode({ vehicle, livery }: RouteModeProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span aria-hidden className="block size-9 shrink-0 *:size-full">
        <VehicleIcon vehicle={vehicle} />
      </span>
      <span
        className={
          'rounded-lg px-2 text-base-lower/6 font-bold whitespace-nowrap ' + MODE_CHIP[livery]
        }
      >
        {MODE_LABEL[vehicle]}
      </span>
    </span>
  );
}

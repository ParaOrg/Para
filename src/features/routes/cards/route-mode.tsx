import { MODE_LABEL } from './route-modes';
import { VehicleIcon } from './vehicle-icon';
import type { Vehicle } from '../model/vehicles';

interface RouteModeProps {
  vehicle: Vehicle;
}

/**
 * Figma's Modes (4236:17040): what a card's routes ride, the vehicle's drawing and its word,
 * Regular 14/20. In the card's words' colour: Content/inverse, white, on every card Figma draws,
 * and the dark words of MRT-3's.
 */
export function RouteMode({ vehicle }: RouteModeProps) {
  return (
    <span className="inline-flex items-center gap-1 text-sm/5 font-normal whitespace-nowrap">
      <span aria-hidden className="size-5 shrink-0 *:size-full">
        <VehicleIcon vehicle={vehicle} />
      </span>
      {MODE_LABEL[vehicle]}
    </span>
  );
}

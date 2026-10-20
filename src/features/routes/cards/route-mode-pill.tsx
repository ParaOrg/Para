import { MODE_LABEL } from './route-modes';
import { VehicleIcon } from './vehicle-icon';
import type { Vehicle } from '../model/vehicles';

interface RouteModePillProps {
  vehicle: Vehicle;
}

/**
 * Figma's Modes (4236:17040): what a card's routes ride, in a white outline —
 * the vehicle's drawing and its word, Medium 12/16. In the card's words' colour:
 * Content/inverse, white, on every card Figma draws, and the dark words of MRT-3's.
 */
export function RouteModePill({ vehicle }: RouteModePillProps) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full border border-current px-1 py-0.5 text-xs/4 font-medium whitespace-nowrap">
      <span aria-hidden className="size-4 shrink-0 *:size-full">
        <VehicleIcon vehicle={vehicle} />
      </span>
      {MODE_LABEL[vehicle]}
    </span>
  );
}

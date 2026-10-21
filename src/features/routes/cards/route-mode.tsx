import { CARD_SURFACE_TEXT } from './livery-card';
import { MODE_LABEL } from './route-modes';
import { VehicleIcon } from './vehicle-icon';
import type { Livery } from '../model/liveries';
import type { Vehicle } from '../model/vehicles';

interface RouteModeProps {
  vehicle: Vehicle;
  /** The card it sits on: the vehicle is drawn in the card's own colour. */
  livery: Livery;
}

/**
 * Figma's Modes (4236:17040): what a card's routes ride. The vehicle, 16, in the card's own
 * colour on a round white chip (Background/surface, 2 round it), then its word in Medium 14/20 in
 * the card's words' colour, 6 between them; all of it at 70% (Figma's opacity/70).
 */
export function RouteMode({ vehicle, livery }: RouteModeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm/5 font-medium whitespace-nowrap opacity-70">
      <span
        aria-hidden
        className={'shrink-0 rounded-full bg-surface p-0.5 ' + CARD_SURFACE_TEXT[livery]}
      >
        <span className="block size-4 *:size-full">
          <VehicleIcon vehicle={vehicle} />
        </span>
      </span>
      {MODE_LABEL[vehicle]}
    </span>
  );
}

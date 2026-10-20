import { MODE_LABEL } from './route-modes';
import { VehicleIcon } from './vehicle-icon';
import type { Vehicle } from '../model/vehicles';

// Figma draws Bus with a 2px gap between its icon and word, the other pills with 4px.
const GAP = {
  'LRT-1': 'gap-1',
  'LRT-2': 'gap-1',
  'MRT-3': 'gap-1',
  Jeepney: 'gap-1',
  'E-Jeep': 'gap-1',
  Bus: 'gap-0.5',
  Ferry: 'gap-1',
} satisfies Record<Vehicle, string>;

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
    <span
      className={
        'inline-flex items-center rounded-full border border-current px-1.5 py-0.5 text-xs/4 font-medium whitespace-nowrap ' +
        GAP[vehicle]
      }
    >
      <span aria-hidden className="size-4 shrink-0 *:size-full">
        <VehicleIcon vehicle={vehicle} />
      </span>
      {MODE_LABEL[vehicle]}
    </span>
  );
}

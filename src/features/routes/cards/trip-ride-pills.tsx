import { cn } from '@/shared/utils/cn';

import { SURFACE_ARROW } from './route-card-look';
import { MODE_BADGE_LABEL } from './route-modes';
import { VehicleIcon } from './vehicle-icon';
import type { Livery } from '../model/liveries';
import type { Vehicle } from '../model/vehicles';

interface TripRidePillsProps {
  /** What the trip rides. */
  vehicle: Vehicle;
  /** After the mode, a train's bound, "Northbound", or a loop's name, "UP – Ikot"; or null. */
  detail: string | null;
  /** The trip's livery: the vehicle's colour, where it stands out from the surface. */
  livery: Livery;
}

/**
 * What a trip rides, at the top of its panel (BottomContent, 4796:30124): a white pill with the
 * vehicle, 20, in its mode's colour, and its word, "Jeep", in SemiBold 16/24; a train's line and
 * bound, "LRT 1 · Northbound", or a loop's mode and name, "Jeep · UP – Ikot". A label, not a
 * control. Until the time pill joins it, it takes the whole row; a long name wraps inside it.
 */
export function TripRidePills({ vehicle, detail, livery }: TripRidePillsProps) {
  const label = detail ? `${MODE_BADGE_LABEL[vehicle]} · ${detail}` : MODE_BADGE_LABEL[vehicle];
  return (
    <div className="flex w-full gap-3 font-sn-pro">
      <p
        data-testid="trip-mode"
        className="flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full bg-bg-fill px-3.5 py-2.5 text-center text-base-lower font-semibold text-text-primary shadow-sm"
      >
        <span aria-hidden className={cn('flex size-5 shrink-0 *:size-full', SURFACE_ARROW[livery])}>
          <VehicleIcon vehicle={vehicle} />
        </span>
        {label}
      </p>
    </div>
  );
}

import type { ComponentPropsWithoutRef } from 'react';

import { CircleArrowRightIcon } from '@/shared/ui/route-icons';

import { VehicleIcon } from './vehicle-icon';
import type { Vehicle } from '../model/vehicles';

type Props = Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'children'> & {
  /** Figma's routeDirection: the place the row's route goes to. */
  routeDirection: string;
  /**
   * The row's route's vehicle, drawn at its right end (Figma's Jeep, 4197:13125–13128). Figma draws
   * only the Jeep; the owner keeps each row's own route's vehicle, as a trip's header names it
   * (vehicleOf). Null, a mode with no drawing: none.
   */
  vehicle: Vehicle | null;
};

// 10 above and below, 44 tall.
const BAR = 'flex w-full items-center gap-1 px-4 py-2.5 text-left text-base/6 font-medium';
// Pressed, Background/surface-tertiary, as Figma's RouteTripDetail Pressed draws it. The hover is
// tertiary too.
const ON_SURFACE =
  'rounded-full text-content-primary transition-colors duration-quick ease-move hover:bg-surface-tertiary active:bg-surface-tertiary';

/**
 * Figma's .RouteEndPointBar, variant RouteTripDetail (3848:11928): a trip's "Other routes" row on
 * the sheet's surface, a route by where it goes, the circled arrow before it and its vehicle at 75
 * after it, a button that opens it. A RouteCard's row is RouteCardEndPoint.
 */
export function RouteEndPointBar({ routeDirection, vehicle, className, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={BAR + ' ' + ON_SURFACE + (className ? ' ' + className : '')}
    >
      <span aria-hidden className="size-6 shrink-0 *:size-full">
        <CircleArrowRightIcon />
      </span>
      <span className="min-w-0 flex-1">{routeDirection}</span>
      {vehicle && (
        <span aria-hidden className="size-6 shrink-0 opacity-75 *:size-full">
          <VehicleIcon vehicle={vehicle} />
        </span>
      )}
    </button>
  );
}

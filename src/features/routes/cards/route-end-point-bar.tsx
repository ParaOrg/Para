import type { ComponentPropsWithoutRef } from 'react';

import { CircleArrowRightIcon } from '@/shared/ui/route-icons';

import { ROW_PRESSED } from './livery-card';
import { VehicleIcon } from './vehicle-icon';
import type { Livery } from '../model/liveries';
import type { Vehicle } from '../model/vehicles';

type Props = Omit<ComponentPropsWithoutRef<'button'>, 'type' | 'children'> & {
  /** Figma's routeDirection: the place the row's route goes to. */
  routeDirection: string;
  /**
   * What it sits on: a RouteCard in its livery, the row pressing to the
   * card's timeline colour (ROW_PRESSED); or the sheet's own surface, under a
   * trip's tiles, the row rounded and pressing grey as the fare tile does.
   */
  on: Livery | 'surface';
  /**
   * The row's route's vehicle, drawn at its right end (Figma's Jeep,
   * 4197:13125–13128, the owner's "new update" of 2026-10-16). Figma draws
   * only the Jeep; each row's own route's vehicle, as a trip's header names
   * it (vehicleOf), is Claude's call of the same day. Null, a mode with no
   * drawing: none.
   */
  vehicle: Vehicle | null;
};

// 10 above and below, 44 tall (the owner's "new update" of 2026-10-16; 8
// and 40 before).
const BAR = 'flex w-full items-center gap-1 px-4 py-2.5 text-left text-base/6 font-medium';
// Pressed, Background/surface-tertiary, as Figma's RouteTripDetail Pressed
// draws it since 2026-10-16 (quaternary, after a tertiary hover, while it
// drew no state). The hover keeps tertiary.
const ON_SURFACE =
  'rounded-full text-content-primary transition-colors duration-quick ease-move hover:bg-surface-tertiary active:bg-surface-tertiary';
/** The vehicle's strength: Figma's 70 on a card's colour, 75 on the sheet's surface. */
const VEHICLE_OPACITY = { card: 'opacity-70', surface: 'opacity-75' } as const;

/**
 * The owner's .RouteEndPointBar (Figma 3656:132): a route by where it goes,
 * the circled arrow before it and its vehicle after it (3848:11928, 2026-10-16),
 * a button that opens it. One component where
 * Figma has one — a RouteCard's rows (RouteCard) and a trip's "Other routes"
 * (TimelineRouteDetailCard) — so a change to the row is made once.
 */
export function RouteEndPointBar({ routeDirection, on, vehicle, className, ...rest }: Props) {
  return (
    <button
      type="button"
      {...rest}
      className={
        BAR +
        ' ' +
        (on === 'surface' ? ON_SURFACE : ROW_PRESSED[on]) +
        (className ? ' ' + className : '')
      }
    >
      <span aria-hidden className="size-6 shrink-0 *:size-full">
        <CircleArrowRightIcon />
      </span>
      <span className="min-w-0 flex-1">{routeDirection}</span>
      {vehicle && (
        <span
          aria-hidden
          className={
            'size-6 shrink-0 *:size-full ' + VEHICLE_OPACITY[on === 'surface' ? 'surface' : 'card']
          }
        >
          <VehicleIcon vehicle={vehicle} />
        </span>
      )}
    </button>
  );
}

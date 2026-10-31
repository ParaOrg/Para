import type { ReactNode } from 'react';

import {
  BusIcon,
  EJeepIcon,
  FerryIcon,
  JeepneyIcon,
  TrainIcon,
  UvExpressIcon,
} from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { vehicleRidesFigure } from './commute-figures';

/** The vehicles the grid shows, in the frame's order. Tricycle and Other are left out. */
export type GridVehicle = 'jeep' | 'eJeep' | 'uvExpress' | 'bus' | 'train' | 'ferry';

/** Rides by vehicle. */
export type VehicleRides = Record<GridVehicle, number>;

interface VehicleCell {
  vehicle: GridVehicle;
  name: string;
  icon: ReactNode;
}

const CELLS: readonly VehicleCell[] = [
  { vehicle: 'jeep', name: 'Jeep', icon: <JeepneyIcon /> },
  { vehicle: 'eJeep', name: 'E-Jeep', icon: <EJeepIcon /> },
  { vehicle: 'uvExpress', name: 'UV Express', icon: <UvExpressIcon /> },
  { vehicle: 'bus', name: 'Bus', icon: <BusIcon /> },
  { vehicle: 'train', name: 'Train', icon: <TrainIcon /> },
  { vehicle: 'ferry', name: 'Ferry', icon: <FerryIcon /> },
];

/** Three to a row, as the frame lays them out. */
const PER_ROW = 3;

interface VehicleGridProps {
  rides: VehicleRides;
}

/**
 * Figma's vehicle card (4514:23003): the rides on each vehicle, three across and two down with
 * hairlines between. None reads `--`, said to a screen reader as "none".
 */
export function VehicleGrid({ rides }: VehicleGridProps) {
  return (
    <ul
      aria-label="Rides by vehicle"
      className="grid grid-cols-3 rounded-3xl bg-surface px-2 py-4 font-sn-pro shadow-large"
    >
      {CELLS.map(({ vehicle, name, icon }, index) => {
        const figure = vehicleRidesFigure(rides[vehicle]);
        const isTopRow = index < PER_ROW;
        return (
          <li
            key={vehicle}
            className={cn(
              'flex flex-col-reverse items-center border-border-primary',
              isTopRow ? 'border-b-0-6 pb-4' : 'pt-4',
              index % PER_ROW !== 0 && 'border-l-0-6',
            )}
          >
            <span className="flex items-center gap-1 text-sm/5 whitespace-nowrap text-content-disabled">
              <span aria-hidden className="size-4 shrink-0 *:size-full">
                {icon}
              </span>
              {name}
            </span>
            <span className="text-2xl/8 font-semibold text-content-primary">
              {figure === '--' ? (
                <>
                  <span aria-hidden>--</span>
                  <span className="sr-only">none</span>
                </>
              ) : (
                figure
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

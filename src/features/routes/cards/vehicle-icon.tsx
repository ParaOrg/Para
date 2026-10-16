import type { ComponentType } from 'react';

import { BusIcon, EJeepIcon, FerryIcon, JeepneyIcon, TrainIcon } from '@/shared/ui/route-icons';

import type { Vehicle } from '../model/vehicles';

interface VehicleIconProps {
  vehicle: Vehicle;
}

const ICON = {
  'LRT-1': TrainIcon,
  'LRT-2': TrainIcon,
  'MRT-3': TrainIcon,
  Jeepney: JeepneyIcon,
  'E-Jeep': EJeepIcon,
  Bus: BusIcon,
  Ferry: FerryIcon,
} satisfies Record<Vehicle, ComponentType>;

/**
 * A vehicle's drawing from the sprite, in currentColor: a trip's header (RouteTripDetailHeader) and
 * each route's row (RouteEndPointBar). The size and the opacity are the caller's.
 */
export function VehicleIcon({ vehicle }: VehicleIconProps) {
  const Icon = ICON[vehicle];
  return <Icon />;
}

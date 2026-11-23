import type { Direction } from './routes';
import { vehicleOf, type Vehicle } from './vehicles';

/**
 * What the route list's filter can narrow it to: every route, or one kind of ride. LRT is both
 * light-rail lines, MRT the metro.
 */
export const MODE_FILTERS = ['all', 'jeep', 'ejeep', 'bus', 'lrt', 'mrt', 'ferry'] as const;
export type ModeFilter = (typeof MODE_FILTERS)[number];

/** A filter and its setter, kept by whoever lights the map, so the map and the cards agree. */
export interface ModeFilterControl {
  filter: ModeFilter;
  onFilter: (filter: ModeFilter) => void;
}

/** Each option as the filter writes it. */
export const MODE_FILTER_LABEL = {
  all: 'All',
  jeep: 'Jeep',
  ejeep: 'E-Jeep',
  bus: 'Bus',
  lrt: 'LRT',
  mrt: 'MRT',
  ferry: 'Ferry',
} satisfies Record<ModeFilter, string>;

/**
 * The vehicles each option keeps. By vehicle, not by card colour: a tricycle wears Jeep's colours
 * and P2P UV Express's, but neither is a jeep, so they and UV Express show under All only.
 */
const KEPT_VEHICLES = {
  jeep: ['Jeepney'],
  ejeep: ['E-Jeep'],
  bus: ['Bus'],
  lrt: ['LRT-1', 'LRT-2'],
  mrt: ['MRT-3'],
  ferry: ['Ferry'],
} satisfies Record<Exclude<ModeFilter, 'all'>, readonly Vehicle[]>;

/** Whether a direction stays listed under a filter. */
export function passesModeFilter(direction: Direction, filter: ModeFilter): boolean {
  if (filter === 'all') return true;
  const vehicle = vehicleOf(direction);
  const kept: readonly Vehicle[] = KEPT_VEHICLES[filter];
  return vehicle !== null && kept.includes(vehicle);
}

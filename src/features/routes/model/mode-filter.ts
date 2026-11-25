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

/** One kind of ride the filter can pick: every option but All. */
export type Mode = Exclude<ModeFilter, 'all'>;

/** The modes, in the order the filter lists them. */
export const MODES = MODE_FILTERS.filter((option): option is Mode => option !== 'all');

/**
 * The modes picked (the owner's call, 2026-11-25: several at once, as jeep, UV and bus). None
 * picked lists every route, and so does every mode picked: both read as All.
 */
export type ModePicks = readonly Mode[];

/** The picks a single choice makes: none under All, else that one. */
export function picksOf(filter: ModeFilter): ModePicks {
  return filter === 'all' ? [] : [filter];
}

/** Whether the picks narrow anything: some modes, but not all of them. */
export function isNarrowed(picks: ModePicks): boolean {
  return picks.length > 0 && MODES.some((mode) => !picks.includes(mode));
}

/** How many modes are picked, for the filter button's count: none when nothing is narrowed. */
export function pickCount(picks: ModePicks): number {
  return isNarrowed(picks) ? new Set(picks).size : 0;
}

/** How many modes a filter has picked, for its button's count: one, or none under All. */
export function modesPicked(filter: ModeFilter): number {
  return pickCount(picksOf(filter));
}

/**
 * The picks with `mode` picked or let go, in the filter's order. Picking the last mode left out
 * reads as All: every route, nothing picked.
 */
export function togglePick(picks: ModePicks, mode: Mode): ModePicks {
  const next = picks.includes(mode) ? picks.filter((m) => m !== mode) : [...picks, mode];
  const ordered = MODES.filter((m) => next.includes(m));
  return isNarrowed(ordered) ? ordered : [];
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
} satisfies Record<Mode, readonly Vehicle[]>;

/** Whether a direction stays listed under these picks: it is a ride of any mode picked. */
export function passesModePicks(direction: Direction, picks: ModePicks): boolean {
  if (!isNarrowed(picks)) return true;
  const vehicle = vehicleOf(direction);
  return vehicle !== null && picks.some((mode) => KEPT_VEHICLES[mode].some((v) => v === vehicle));
}

/** Whether a direction stays listed under a filter: a single choice's picks (picksOf). */
export function passesModeFilter(direction: Direction, filter: ModeFilter): boolean {
  return passesModePicks(direction, picksOf(filter));
}

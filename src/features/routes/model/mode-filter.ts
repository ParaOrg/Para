import type { Direction } from './routes';
import { RAIL_LINES } from './routes';
import { vehicleOf, type Vehicle } from './vehicles';

/**
 * What the route list's filter can narrow it to: every route, or kinds of ride. The owner's rows
 * (the filter menu, 4896:42082, 2026-11-25), in order: Train is every rail line in one, LRT and MRT
 * alike; Premium Bus / P2P is the premium buses.
 */
export const MODE_FILTERS = ['all', 'jeep', 'ejeep', 'uv', 'bus', 'p2p', 'train', 'ferry'] as const;
export type ModeFilter = (typeof MODE_FILTERS)[number];

/** One kind of ride the filter can pick: every option but All. */
export type Mode = Exclude<ModeFilter, 'all'>;

/** The modes, in the order the filter lists them. */
export const MODES = MODE_FILTERS.filter((option): option is Mode => option !== 'all');

/**
 * The modes picked (the owner's call, 2026-11-25: several at once, as jeep, UV and bus). None
 * picked lists every route, and so does every mode picked: both read as All.
 */
export type ModePicks = readonly Mode[];

/** No mode picked: every route listed. One array, so a new list's reset keeps the same picks. */
export const NO_PICKS: ModePicks = [];

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

/** The modes picked and their setter, kept by whoever lights the map, so the map and the cards agree. */
export interface ModeFilterControl {
  picks: ModePicks;
  onPicks: (picks: ModePicks) => void;
}

/** The picks' names in the filter's order, for the filter button's name: "Jeepney, Bus". */
export function picksNamed(picks: ModePicks): string {
  return picks.map((mode) => MODE_FILTER_LABEL[mode]).join(', ');
}

/** The picks' names as either one, for an empty list: "Jeepney or Bus", "Jeepney, Bus or Train". */
export function picksEither(picks: ModePicks): string {
  const names = picks.map((mode) => MODE_FILTER_LABEL[mode]);
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;
}

/** Each option as the filter writes it. */
export const MODE_FILTER_LABEL = {
  all: 'All',
  jeep: 'Jeepney',
  ejeep: 'E-Jeep',
  uv: 'UV Express',
  bus: 'Bus',
  p2p: 'Premium Bus / P2P',
  train: 'Train',
  ferry: 'Ferry',
} satisfies Record<ModeFilter, string>;

/** A direction rides one of these vehicles (vehicleOf). */
const ridesOneOf =
  (...kept: readonly Vehicle[]) =>
  (direction: Direction): boolean => {
    const vehicle = vehicleOf(direction);
    return vehicle !== null && kept.includes(vehicle);
  };

/**
 * What each option keeps. By vehicle, not by card colour: a tricycle wears Jeep's colours but is
 * no jeep, so it shows under All only. P2P has no vehicle of its own (vehicleOf), so it is kept by
 * its route's mode; the EDSA Carousel rides under it too (the owner's rule).
 */
const KEPT = {
  jeep: ridesOneOf('Jeepney'),
  ejeep: ridesOneOf('E-Jeep'),
  uv: ridesOneOf('UV Express'),
  bus: ridesOneOf('Bus'),
  p2p: (direction) => direction.route?.mode === 'p2p' || ridesOneOf('EDSA Carousel')(direction),
  train: ridesOneOf(...RAIL_LINES),
  ferry: ridesOneOf('Ferry'),
} satisfies Record<Mode, (direction: Direction) => boolean>;

/** Whether a direction stays listed under these picks: it is a ride of any mode picked. */
export function passesModePicks(direction: Direction, picks: ModePicks): boolean {
  return !isNarrowed(picks) || picks.some((mode) => KEPT[mode](direction));
}

/** Whether a direction stays listed under a filter: a single choice's picks (picksOf). */
export function passesModeFilter(direction: Direction, filter: ModeFilter): boolean {
  return passesModePicks(direction, picksOf(filter));
}

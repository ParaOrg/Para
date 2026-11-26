import type { TransportMode } from './direction-schema';

/**
 * The busway lines: the EDSA Carousel, EDSA-C. Its buses run in their own lane and stop only at
 * their own stations, so it is a line as a train is: drawn as a plain bus it would pick up every
 * jeep hintuan along EDSA (servedBy).
 */
export const BUSWAY_MODES: readonly TransportMode[] = ['busway'];
export const BUSWAY_LINES = ['EDSA-C'] as const;
export type BuswayLine = (typeof BUSWAY_LINES)[number];

/** The EDSA Carousel's line: each of its stations' `line`. Its routes need none: their mode says it. */
export const CAROUSEL_LINE: BuswayLine = 'EDSA-C';

export const isBusway = (mode: TransportMode | null | undefined): boolean =>
  !!mode && BUSWAY_MODES.includes(mode);

/**
 * The line a route of this mode runs on, when the mode alone says it: the busway's one line. Null
 * for a train, whose mode runs more than one line, and for every mode that is not a line.
 */
export function lineOfMode(mode: TransportMode | null | undefined): BuswayLine | null {
  return isBusway(mode) ? CAROUSEL_LINE : null;
}

/**
 * The EDSA Carousel's stations, north to south: each a slot of the line, by the name riders and its
 * signs use, then the other names it goes by. What a Carousel direction's bound is read from
 * (railBound). From the routes study (Top Gear, 2025-10-22; mapaPH; OSM relation 10183711). A
 * station served one way only (Tramo, southbound) keeps its place; Ayala Malls Manila Bay
 * (southbound) and City of Dreams (northbound) share one. A trip between names this list does not
 * know shows no bound, never a guessed one.
 */
export const CAROUSEL_STATIONS: readonly (readonly string[])[] = [
  ['Monumento', 'MCU'],
  ['Bagong Barrio'],
  ['Balintawak'],
  ['Kaingin'],
  ['Fernando Poe Jr.', 'Roosevelt'],
  ['SM North EDSA', 'SM North'],
  ['North Avenue', 'North Ave'],
  ['Philam', 'Philam QC'],
  ['Quezon Avenue', 'Quezon Ave'],
  ['Kamuning', 'GMA Kamuning'],
  ['Nepa Q-Mart'],
  ['Main Avenue', 'Main Ave'],
  ['Santolan-Annapolis', 'Santolan'],
  ['Ortigas'],
  ['Guadalupe'],
  ['Buendia'],
  ['Ayala', 'One Ayala'],
  ['Tramo'],
  ['Taft Avenue', 'Taft'],
  ['Roxas Boulevard', 'Roxas Blvd'],
  ['SM Mall of Asia', 'MOA'],
  ['DFA'],
  ['Ayala Malls Manila Bay', 'City of Dreams'],
  ['PITX'],
];

const fold = (name: string) => name.trim().toLowerCase();

/** A station's place on the line, counted from Monumento; -1 when the list does not know it. */
export function carouselStationIndex(name: string): number {
  const folded = fold(name);
  return CAROUSEL_STATIONS.findIndex((names) => names.some((station) => fold(station) === folded));
}

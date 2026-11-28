import type { MenuChoice } from './menu-list';

/** How "+ Add route" adds a route's undrawn direction: drawn by hand, or from a line picked. */
export type AddWay = 'draw' | 'osm' | 'old-para';

/** "+ Add route"'s menu, in its order. */
export const ADD_WAY_CHOICES = [
  { id: 'draw', label: 'Draw it' },
  { id: 'osm', label: 'Start from an OSM route' },
  { id: 'old-para', label: 'Start from an old Para route' },
] as const satisfies readonly (MenuChoice & { id: AddWay })[];

/** A menu choice's id read back as the way it names; null for any other. */
export function addWayOf(id: string): AddWay | null {
  return ADD_WAY_CHOICES.find((choice) => choice.id === id)?.id ?? null;
}

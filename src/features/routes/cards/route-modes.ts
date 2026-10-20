import type { Vehicle } from '../model/vehicles';

/**
 * What a RouteCard's mode says (Figma's Modes, 4236:17040): a train's line
 * is one word on the card, "Train"; its code is the trip header's.
 */
export const MODE_LABEL = {
  'LRT-1': 'Train',
  'LRT-2': 'Train',
  'MRT-3': 'Train',
  Jeepney: 'Jeepney',
  'E-Jeep': 'E-Jeep',
  Bus: 'Bus',
  Ferry: 'Ferry',
} satisfies Record<Vehicle, string>;

interface ModeGroup<T> {
  /** The mode the group's label names; null for rows that ride nothing the design draws. */
  vehicle: Vehicle | null;
  items: T[];
}

/**
 * A card's rows under the mode they ride, one group for each mode in the order it first appears,
 * the rows keeping their order inside it. Rows with no vehicle form a group with no label.
 */
export function groupByMode<T extends { vehicle: Vehicle | null }>(
  items: readonly T[],
): ModeGroup<T>[] {
  const groups = new Map<string, ModeGroup<T>>();
  for (const item of items) {
    const key = item.vehicle ? MODE_LABEL[item.vehicle] : '';
    const group = groups.get(key);
    if (group) group.items.push(item);
    else groups.set(key, { vehicle: item.vehicle, items: [item] });
  }
  return [...groups.values()];
}

import type { Vehicle } from '../model/vehicles';

/**
 * What a RouteCard's mode says (Figma's Modes, 4236:17040): a train's line
 * is one word on the card, "Train"; its code is the trip header's.
 */
export const MODE_LABEL = {
  'LRT-1': 'Train',
  'LRT-2': 'Train',
  'MRT-3': 'Train',
  Jeepney: 'Jeep',
  'E-Jeep': 'E-Jeep',
  Bus: 'Bus',
  Ferry: 'Ferry',
  'UV Express': 'UV Express',
} satisfies Record<Vehicle, string>;

interface ModeGroup<T> {
  /** The mode the group's label names; null for rows that ride nothing the design draws. */
  vehicle: Vehicle | null;
  items: T[];
}

/** Groups that close a card, in this order, after every road group. */
const LAST_LABELS = ['Train', 'Ferry'];

/**
 * A card's rows under the mode they ride, one group for each mode, the rows keeping their order
 * inside it. Road groups come first, in the order each first appears; the Train group and then the
 * Ferry group close the card, wherever their rows sit in the data. Rows with no vehicle form a
 * group with no label, among the road groups.
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
  const road = [...groups].filter(([key]) => !LAST_LABELS.includes(key));
  const last = LAST_LABELS.flatMap((key) => groups.get(key) ?? []);
  return [...road.map(([, group]) => group), ...last];
}

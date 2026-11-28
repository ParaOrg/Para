import {
  directionEnds,
  directionLine,
  isDrawn,
  isLoop,
  type Direction,
} from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

/** The four bounds a direction is named by, from where its line starts to where it ends. */
export type Bound = 'Northbound' | 'Southbound' | 'Eastbound' | 'Westbound';

/** One tab of the route line detail: a direction of the open route, named by its bound. */
export interface DirectionTab {
  direction: Direction;
  /** Its name on the tab: its bound, or "To <destination>" when both ways would share one. */
  label: string;
  /** False for the slot of a way not drawn yet: its tab offers to add it instead. */
  isDrawn: boolean;
}

/**
 * The overall heading of a line, start to end, as a bound: north or south when it moves further
 * that way than east or west, and east or west otherwise. Null for a line with no length.
 */
export function boundOf(line: readonly LngLat[]): Bound | null {
  if (line.length < 2) return null;
  const [startLng, startLat] = line[0];
  const [endLng, endLat] = line[line.length - 1];
  // A degree of longitude is shorter than one of latitude away from the equator.
  const east = (endLng - startLng) * Math.cos((((startLat + endLat) / 2) * Math.PI) / 180);
  const north = endLat - startLat;
  if (east === 0 && north === 0) return null;
  if (Math.abs(north) >= Math.abs(east)) return north > 0 ? 'Northbound' : 'Southbound';
  return east > 0 ? 'Eastbound' : 'Westbound';
}

/**
 * The tabs for the open direction's route: one per direction, the way there first, each named
 * by its bound; if both drawn ways come out the same bound (or either has none), each is named
 * "To <destination>" instead. A loop has one direction and no tabs.
 */
export function directionTabs(
  direction: Direction,
  directions: readonly Direction[],
): DirectionTab[] {
  if (isLoop(direction)) return [];
  const ways = directions
    .filter((v) => v.routeId === direction.routeId)
    .sort((a, b) => Number(a.reversed) - Number(b.reversed));
  const bounds = ways.map((v) => (isDrawn(v) ? boundOf(directionLine(v)) : null));
  const drawnBounds = bounds.filter((_, i) => isDrawn(ways[i]));
  const isShared = drawnBounds.includes(null) || new Set(drawnBounds).size < drawnBounds.length;
  return ways.map((v, i) => ({
    direction: v,
    label: isShared ? `To ${directionEnds(v).to}` : (bounds[i] ?? `To ${directionEnds(v).to}`),
    isDrawn: isDrawn(v),
  }));
}

/**
 * A route's drawn way as the save panel's notes name it, while its other way is being drawn: its
 * tab's name (a bound such as Northbound), or "the way to <destination>" where the tab reads
 * "To <destination>".
 */
export function otherWayName(directions: readonly Direction[], routeId: string): string {
  const drawn = directions.find((v) => v.routeId === routeId && isDrawn(v));
  const label = drawn && directionTabs(drawn, directions).find((t) => t.direction === drawn)?.label;
  if (!label) return 'the other way';
  return label.startsWith('To ') ? `the way to ${label.slice(3)}` : label;
}

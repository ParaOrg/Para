import { nearestOnSegment, pointToSegmentM, type LngLat } from '@/shared/utils/geo';

import { roundedWalkM } from './honest-walk';

/**
 * Go here's footbridge hint (.scratch/go-here, ticket 05; footbridges' ticket 04 folded in): when
 * a straight walk crosses a major road, the nearest footbridge over that road, so no one is told to
 * walk across EDSA. Para has no walking paths, so this is one fact, not a route.
 */

/** How far from the crossing a footbridge still counts as the way over. */
export const FOOTBRIDGE_REACH_M = 300;

/** A major road from the major-roads file: its name and its stretches. */
export interface MajorRoadLines {
  name: string | null;
  lines: LngLat[][];
}

/** A footbridge from the footbridge file: what the hint says about it. */
export interface FootbridgeLines {
  name: string | null;
  lines: LngLat[][];
  access: { kind: 'elevator' | 'steps' }[];
}

/** Which way the footbridge is from the crossing, by its larger leg. */
export type Compass = 'north' | 'east' | 'south' | 'west';

export interface NearFootbridge {
  name: string | null;
  distanceM: number;
  side: Compass;
  hasElevator: boolean;
}

/** One road a walk crosses, and the footbridge over it, or null when none is mapped near. */
export interface RoadCrossing {
  road: string | null;
  at: LngLat;
  footbridge: NearFootbridge | null;
}

/** Where segments ab and cd cross, as a fraction of ab, or null when they don't. */
function crossingAlong(a: LngLat, b: LngLat, c: LngLat, d: LngLat): number | null {
  const [rx, ry] = [b[0] - a[0], b[1] - a[1]];
  const [sx, sy] = [d[0] - c[0], d[1] - c[1]];
  const denominator = rx * sy - ry * sx;
  if (denominator === 0) return null;
  const t = ((c[0] - a[0]) * sy - (c[1] - a[1]) * sx) / denominator;
  const u = ((c[0] - a[0]) * ry - (c[1] - a[1]) * rx) / denominator;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : null;
}

const segmentsOf = (lines: LngLat[][]): [LngLat, LngLat][] =>
  lines.flatMap((line) => line.slice(1).map((end, i): [LngLat, LngLat] => [line[i], end]));

/** How far along the walk it first crosses any of the lines, or null. */
function firstCrossing(from: LngLat, to: LngLat, lines: LngLat[][]): number | null {
  let first: number | null = null;
  for (const [c, d] of segmentsOf(lines)) {
    const t = crossingAlong(from, to, c, d);
    if (t !== null && (first === null || t < first)) first = t;
  }
  return first;
}

function compassOf(from: LngLat, to: LngLat): Compass {
  const east = (to[0] - from[0]) * Math.cos((from[1] * Math.PI) / 180);
  const north = to[1] - from[1];
  if (Math.abs(north) >= Math.abs(east)) return north >= 0 ? 'north' : 'south';
  return east >= 0 ? 'east' : 'west';
}

/** The footbridge over the road nearest `at`, within FOOTBRIDGE_REACH_M. */
function footbridgeNear(
  at: LngLat,
  roadLines: LngLat[][],
  footbridges: readonly FootbridgeLines[],
): NearFootbridge | null {
  let nearest: NearFootbridge | null = null;
  for (const footbridge of footbridges) {
    let distanceM = Infinity;
    let point = at;
    for (const [a, b] of segmentsOf(footbridge.lines)) {
      const m = pointToSegmentM(at, a, b);
      if (m < distanceM) [distanceM, point] = [m, nearestOnSegment(at, a, b).point];
    }
    if (distanceM > FOOTBRIDGE_REACH_M || (nearest && distanceM >= nearest.distanceM)) continue;
    const isOverRoad = segmentsOf(footbridge.lines).some(
      ([a, b]) => firstCrossing(a, b, roadLines) !== null,
    );
    if (!isOverRoad) continue;
    nearest = {
      name: footbridge.name,
      distanceM,
      side: compassOf(at, point),
      hasElevator: footbridge.access.some((access) => access.kind === 'elevator'),
    };
  }
  return nearest;
}

/**
 * The major roads a straight walk from `from` to `to` crosses, in the order it meets them, each
 * with its nearest footbridge. A road's carriageways and kinds count as one road by its name.
 */
export function footbridgeHints(
  from: LngLat,
  to: LngLat,
  roads: readonly MajorRoadLines[],
  footbridges: readonly FootbridgeLines[],
): RoadCrossing[] {
  const byName = new Map<string | MajorRoadLines, LngLat[][]>();
  for (const road of roads) {
    const key = road.name ?? road;
    byName.set(key, [...(byName.get(key) ?? []), ...road.lines]);
  }
  const crossings: (RoadCrossing & { t: number })[] = [];
  for (const [key, lines] of byName) {
    const t = firstCrossing(from, to, lines);
    if (t === null) continue;
    const at: LngLat = [from[0] + t * (to[0] - from[0]), from[1] + t * (to[1] - from[1])];
    const road = typeof key === 'string' ? key : null;
    crossings.push({ t, road, at, footbridge: footbridgeNear(at, lines, footbridges) });
  }
  return crossings
    .sort((a, b) => a.t - b.t)
    .map(({ road, at, footbridge }) => ({ road, at, footbridge }));
}

/**
 * A crossing in words: "Cross Commonwealth Avenue by the footbridge 120 m north (elevator)", or
 * "Crosses Commonwealth Avenue: no footbridge mapped nearby". The owner designs the final words.
 */
export function footbridgeHintWords({ road, footbridge }: RoadCrossing): string {
  const name = road ?? 'a major road';
  if (!footbridge) return `Crosses ${name}: no footbridge mapped nearby`;
  const elevator = footbridge.hasElevator ? ' (elevator)' : '';
  return `Cross ${name} by the footbridge ${roundedWalkM(footbridge.distanceM)} m ${footbridge.side}${elevator}`;
}

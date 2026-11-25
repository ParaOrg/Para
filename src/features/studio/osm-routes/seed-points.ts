import { haversine, type LngLat } from '@/shared/utils/geo';

import type { OsmRoute } from './osm-route-schema';

/*
 * An OSM route as the points a new drawing starts from (.scratch/osm-route-start/plan.md, step 2):
 * the drawing takes them as its control points and the router answers every gap between them, as
 * it does for an upload's line (useDrawing's startWithPoints). The saved line is then the router's,
 * like every line drawn by hand; OSM's own geometry only says where to put the points.
 */

/** A turn sharper than this keeps its point: the router must not cut the corner. */
export const TURN_DEG = 25;
/** The farthest apart two seeded points may be, so the router cannot wander between them. */
export const MAX_SPACING_M = 400;
/** A route whose end comes back this close to its start went out and back. */
const BACK_HOME_M = 200;
/** And it must have gone at least this far for the turnaround to mean anything. */
const OUT_AT_LEAST_M = 1000;

/** The part of a route a drawing seeds from: its line and the gaps in it. */
export type RouteLine = Pick<OsmRoute, 'line' | 'gaps'>;

/** The compass bearing from a to b, in degrees, flat: close enough for a turn's angle. */
function bearing([lng1, lat1]: LngLat, [lng2, lat2]: LngLat): number {
  const x = (lng2 - lng1) * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180);
  return (Math.atan2(x, lat2 - lat1) * 180) / Math.PI;
}

/** How far a line turns at b, coming from a and going to c: 0 straight on, 180 straight back. */
export function turnAt(a: LngLat, b: LngLat, c: LngLat): number {
  const turn = Math.abs(bearing(b, c) - bearing(a, b)) % 360;
  return turn > 180 ? 360 - turn : turn;
}

/** One stretch's points thinned: its ends, every turn past TURN_DEG, and none MAX_SPACING_M apart. */
function thinStretch(stretch: readonly LngLat[]): LngLat[] {
  const kept: LngLat[] = [stretch[0]];
  let sinceKept = 0;
  for (let i = 1; i < stretch.length - 1; i++) {
    sinceKept += haversine(stretch[i - 1], stretch[i]);
    const isTurn = turnAt(stretch[i - 1], stretch[i], stretch[i + 1]) >= TURN_DEG;
    const nextWouldBeTooFar = sinceKept + haversine(stretch[i], stretch[i + 1]) > MAX_SPACING_M;
    if (isTurn || nextWouldBeTooFar) {
      kept.push(stretch[i]);
      sinceKept = 0;
    }
  }
  if (stretch.length > 1) kept.push(stretch[stretch.length - 1]);
  return kept;
}

/** The line's stretches between its gaps. */
export function stretchesOf({ line, gaps }: RouteLine): LngLat[][] {
  const stretches: LngLat[][] = [];
  let from = 0;
  for (const { after } of gaps) {
    stretches.push(line.slice(from, after + 1));
    from = after + 1;
  }
  stretches.push(line.slice(from));
  return stretches.filter((stretch) => stretch.length > 0);
}

/**
 * The control points to seed a drawing with: each stretch thinned (its ends, its turns, a point
 * at least every MAX_SPACING_M), so a gap's two ends are both kept and the router bridges it.
 * A segment of OSM's line longer than MAX_SPACING_M with no vertex on it (a straight road) is
 * left as it is: the router follows a straight road without help.
 */
export function seedPoints(route: RouteLine): LngLat[] {
  return stretchesOf(route).flatMap(thinStretch);
}

/**
 * Where a route that goes out and comes back turns round, as an index into its line, or null for
 * one that does not: its end within BACK_HOME_M of its start, and its farthest point at least
 * OUT_AT_LEAST_M away. The farthest point is the turnaround. A loop that circles back is caught
 * too; there the farthest point splits it into two halves, which a drawing can take one at a time.
 */
export function turnaroundIndex({ line }: RouteLine): number | null {
  if (line.length < 3 || haversine(line[0], line[line.length - 1]) > BACK_HOME_M) return null;
  let farthest = 0;
  let farthestM = 0;
  line.forEach((point, i) => {
    const metres = haversine(line[0], point);
    if (metres > farthestM) [farthest, farthestM] = [i, metres];
  });
  return farthestM >= OUT_AT_LEAST_M ? farthest : null;
}

/** A route's line split at its turnaround into the way out and the way back, each with its gaps. */
export function splitAtTurnaround(route: RouteLine, at: number): [RouteLine, RouteLine] {
  const out: RouteLine = {
    line: route.line.slice(0, at + 1),
    gaps: route.gaps.filter(({ after }) => after < at),
  };
  const back: RouteLine = {
    line: route.line.slice(at),
    gaps: route.gaps
      .filter(({ after }) => after >= at)
      .map((gap) => ({ ...gap, after: gap.after - at })),
  };
  return [out, back];
}

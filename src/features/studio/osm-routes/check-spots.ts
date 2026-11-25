import { haversine, type LngLat } from '@/shared/utils/geo';

import { metresToLine } from './search-osm-routes';
import type { RouteLine } from './seed-points';

/*
 * The places an editor should check in a drawing seeded from an OSM route
 * (.scratch/osm-route-start/plan.md, step 3): where OSM's line has a gap the router bridged, and
 * where the router's line strays from OSM's (another street, a one-way, a missing turn). Worked
 * out from the drawing and the route each render; nothing is stored.
 */

/** The router's line strays when it is this far from OSM's… */
export const STRAY_M = 30;
/** …for at least this long. */
export const STRAY_FOR_M = 100;
/** A stray this close to a gap is the gap's, not one of its own. */
const SAME_SPOT_M = 50;

export interface CheckSpot {
  /** A gap in OSM's line, which the router bridged, or a stretch where the router left OSM's line. */
  kind: 'gap' | 'stray';
  /** Where to look: the gap's middle, or the stray stretch's middle. */
  at: LngLat;
  /** The gap's width, or how far the router strays at most. */
  metres: number;
}

const middle = (a: LngLat, b: LngLat): LngLat => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

/** The gaps in OSM's line, each where it is and how wide. */
function gapSpots({ line, gaps }: RouteLine): CheckSpot[] {
  return gaps.map(({ after, metres }) => ({
    kind: 'gap',
    at: middle(line[after], line[after + 1]),
    metres,
  }));
}

/** The stretches where the drawn line is more than STRAY_M from OSM's for STRAY_FOR_M or longer. */
function straySpots(drawn: readonly LngLat[], route: RouteLine): CheckSpot[] {
  const spots: CheckSpot[] = [];
  let run: { points: LngLat[]; lengthM: number; farthestM: number } | null = null;
  const close = () => {
    if (run && run.lengthM >= STRAY_FOR_M) {
      spots.push({
        kind: 'stray',
        at: run.points[Math.floor(run.points.length / 2)],
        metres: Math.round(run.farthestM),
      });
    }
    run = null;
  };
  drawn.forEach((point, i) => {
    const metres = metresToLine(point, route.line);
    if (metres <= STRAY_M) {
      close();
      return;
    }
    run ??= { points: [], lengthM: 0, farthestM: 0 };
    if (run.points.length > 0) run.lengthM += haversine(drawn[i - 1], point);
    run.points.push(point);
    run.farthestM = Math.max(run.farthestM, metres);
  });
  close();
  return spots;
}

/**
 * The places to check, in the order the drawn line passes them: OSM's gaps, then every stretch
 * where the drawn line strays, less those at a gap (the router's bridge across a gap strays by
 * nature, and is the gap's spot).
 */
export function checkSpots(drawn: readonly LngLat[], route: RouteLine): CheckSpot[] {
  const gaps = gapSpots(route);
  const strays = straySpots(drawn, route).filter((stray) =>
    gaps.every((gap) => haversine(gap.at, stray.at) > SAME_SPOT_M + gap.metres / 2),
  );
  const along = (spot: CheckSpot) => {
    let nearest = 0;
    let nearestM = Infinity;
    drawn.forEach((point, i) => {
      const metres = haversine(point, spot.at);
      if (metres < nearestM) [nearest, nearestM] = [i, metres];
    });
    return nearest;
  };
  return [...gaps, ...strays].sort((a, b) => along(a) - along(b));
}

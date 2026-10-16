import type { LngLat, Segment, SnapMode } from '@/shared/utils/geo';

/** A pixel on the map. */
interface Pixel {
  x: number;
  y: number;
}

/** The modes of the two stretches either side of a point: before it, and after it. */
export type ModesAround = [SnapMode | undefined, SnapMode | undefined];

/** One request to the router: the gaps from `from` on, one mode each. */
export interface GapRequest {
  from: number;
  modes: SnapMode[];
}

/** The distinct string ids among the features under a tap, in the order first met. */
export function featureIds(
  features: readonly { properties?: { id?: unknown } | null }[],
): string[] {
  return [
    ...new Set(
      features.map((f) => f.properties?.id).filter((id): id is string => typeof id === 'string'),
    ),
  ];
}

/**
 * The index of the pixel nearest `at` within `reach` of it, or null. Of two
 * as near, the later wins.
 */
export function nearestWithin(pixels: readonly Pixel[], at: Pixel, reach: number): number | null {
  let best: number | null = null;
  let bestPx = reach;
  pixels.forEach((q, i) => {
    const px = Math.hypot(q.x - at.x, q.y - at.y);
    if (px <= bestPx) {
      best = i;
      bestPx = px;
    }
  });
  return best;
}

/** The modes of the stretches either side of point `i`. */
export function modesAround(segments: readonly Segment[], i: number): ModesAround {
  return [segments[i - 1]?.snap, segments[i]?.snap];
}

/**
 * Point `i` moved to `point`: the points, and its two stretches rubber-banded
 * straight to it in their modes until they re-route. `standIns` are those new
 * stretches, for the caller to mark. The join point is held by identity, so
 * it is replaced when it is the point moved.
 */
export function rubberBand(
  points: readonly LngLat[],
  segments: readonly Segment[],
  i: number,
  point: LngLat,
  modes: ModesAround,
  join: LngLat | null,
): { points: LngLat[]; segments: Segment[]; standIns: Segment[]; join: LngLat | null } {
  const pts = [...points];
  const nextJoin = pts[i] === join ? point : join;
  pts[i] = point;
  const next = [...segments];
  const standIns: Segment[] = [];
  if (i > 0 && pts[i - 1]) {
    next[i - 1] = { snap: modes[0] ?? 'snapped', coordinates: [pts[i - 1], point] };
    standIns.push(next[i - 1]);
  }
  if (i < pts.length - 1 && pts[i + 1]) {
    next[i] = { snap: modes[1] ?? 'snapped', coordinates: [point, pts[i + 1]] };
    standIns.push(next[i]);
  }
  return { points: pts, segments: next, standIns, join: nextJoin };
}

/**
 * Point `i` of `last + 1` moved: the stretches touching it, before and after,
 * go to the router together as one request. Null for a lone point.
 */
export function gapsAround(i: number, last: number, modes: ModesAround): GapRequest | null {
  const before = modes[0] ?? 'snapped';
  const after = modes[1] ?? 'snapped';
  if (i > 0 && i < last) return { from: i - 1, modes: [before, after] };
  if (i > 0) return { from: i - 1, modes: [before] };
  if (i < last) return { from: i, modes: [after] };
  return null;
}

/**
 * Point `i` put back: of the stretches `before` and `after` it, the ones that
 * were still waiting for the router, as one request; null when neither was.
 */
export function waitingGapsAround(
  before: Segment | undefined,
  after: Segment | undefined,
  i: number,
  isWaiting: (s: Segment) => boolean,
): GapRequest | null {
  const waitingBefore = !!before && isWaiting(before);
  const waitingAfter = !!after && isWaiting(after);
  if (before && after && waitingBefore && waitingAfter) {
    return { from: i - 1, modes: [before.snap, after.snap] };
  }
  if (before && waitingBefore) return { from: i - 1, modes: [before.snap] };
  if (after && waitingAfter) return { from: i, modes: [after.snap] };
  return null;
}

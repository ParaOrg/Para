import {
  EPS,
  firstTouchIndex,
  pointInRing,
  segmentsIntersect,
  type Ring,
} from '@/features/routes/geo/ring';
import { haversine, lineLength, type LngLat } from '@/shared/utils/geo';

// What only the studio asks of a hotspot's ring, apart from routes/geo/ring.ts so that no page
// that only reads the map carries it: a box that crosses itself, and where a line enters a box.
// A box's centroid is routes/geo/box-centre.ts's: the map's pins stand on it too.

/**
 * Whether two edges of the ring that do not share a corner touch or cross: a
 * bow-tie, or a corner dragged across the far side. Such a box has no inside
 * one can trust (pointInRing counts it by crossings) and its centroid can sit
 * outside it, so the studio refuses it before a save. Plain O(n²): a box has
 * a handful of corners.
 */
export function ringCrossesItself(corners: Ring): boolean {
  // A corner repeated where it stands — the ferry's imported stations end on
  // their first corner again — is no side: dropped before the sides are paired.
  const ring = corners.filter((p, i) => {
    const q = corners[(i + 1) % corners.length];
    return corners.length < 2 || p[0] !== q[0] || p[1] !== q[1];
  });
  const n = ring.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      // The last edge and the first share corner 0.
      if (i === 0 && j === n - 1) continue;
      if (segmentsIntersect(ring[i], ring[(i + 1) % n], ring[j], ring[(j + 1) % n])) return true;
    }
  }
  return false;
}

/** Where segments a–b and c–d cross, or null if they do not (parallel/collinear count as no point). */
function crossingPoint(a: LngLat, b: LngLat, c: LngLat, d: LngLat): LngLat | null {
  const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (Math.abs(den) < EPS) return null;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
  if (t < -EPS || t > 1 + EPS || u < -EPS || u > 1 + EPS) return null;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

/**
 * Metres along the line to the point where it first enters the polygon —
 * a vertex inside, or the exact spot a segment crosses an edge. -1 if never.
 * This is what "the route starts at this terminal" is measured with.
 */
export function entryDistance(line: LngLat[], ring: Ring): number {
  const found = firstTouchIndex(line, ring);
  if (found < 0) return -1;
  // A first vertex inside, reached from outside, was entered on the segment
  // before it: measured to that vertex, the entry would overshoot the
  // crossing by up to a segment, 20–30 m on a snapped road.
  if (pointInRing(line[found], ring) && found === 0) return 0;
  const idx = pointInRing(line[found], ring) ? found - 1 : found;
  const upTo = lineLength(line.slice(0, idx + 1));
  // The touch is on segment idx → idx+1: find the nearest crossing on it.
  const a = line[idx];
  const b = line[idx + 1];
  const n = ring.length;
  let best = Infinity;
  for (let j = 0; j < n; j++) {
    const p = crossingPoint(a, b, ring[j], ring[(j + 1) % n]);
    if (p) best = Math.min(best, haversine(a, p));
  }
  return upTo + (Number.isFinite(best) ? best : haversine(a, b));
}

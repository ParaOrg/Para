import {
  EPS,
  firstTouchIndex,
  pointInRing,
  segmentsIntersect,
  type Ring,
} from '@/features/routes/geo/ring';
import { haversine, lineLength, type LngLat } from '@/shared/utils/geo';

// What only the studio asks of a hotspot's ring, apart from routes/geo/ring.ts so that no page
// that only reads the map carries it: a box that crosses itself, where a line enters a box, and
// a box's centroid.

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

/**
 * Area-weighted centroid. Falls back to the vertex average for a degenerate
 * (zero-area) ring so a bad trace still gets a usable label point.
 *
 * The shoelace sums are taken from the ring's first corner, not from 0°, and
 * the corner added back at the end, as signedArea2 in right-of-line.ts does.
 * From 0° every term is about 121 × 14.7 while a box's area is about 1e-8, so
 * the sums would cancel away the digits that matter (measured: a 10 m box at
 * Manila had its centroid some 60 m off, and 23 of the 102 published hotspots
 * had their point outside their own box). From the corner the terms are the
 * box's own size, and the degenerate test below compares an area in square
 * degrees that actually means something (1e-12 is about 0.01 m²).
 */
export function ringCentroid(ring: Ring): LngLat {
  const n = ring.length;
  if (n === 0) return [0, 0];
  const [ox, oy] = ring[0];
  let a2 = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const x1 = ring[i][0] - ox;
    const y1 = ring[i][1] - oy;
    const x2 = ring[(i + 1) % n][0] - ox;
    const y2 = ring[(i + 1) % n][1] - oy;
    const f = x1 * y2 - x2 * y1;
    a2 += f;
    cx += (x1 + x2) * f;
    cy += (y1 + y2) * f;
  }
  if (Math.abs(a2) < EPS) {
    let sx = 0;
    let sy = 0;
    for (const [x, y] of ring) {
      sx += x - ox;
      sy += y - oy;
    }
    return [ox + sx / n, oy + sy / n];
  }
  return [ox + cx / (3 * a2), oy + cy / (3 * a2)];
}

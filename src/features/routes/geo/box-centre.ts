import type { LngLat } from '@/shared/utils/geo';

import { EPS, pointInRing, type Ring } from './ring';

/*
 * The middle of a hotspot's box: its centroid, which the studio saves as the
 * hotspot's point, and the point a pin stands on, which must be inside.
 */

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

/**
 * A point inside the box, at its middle: the centroid, when that is inside,
 * which it always is for a convex box. A non-convex box (an L, a U round a
 * corner) can have its centroid outside it; then the middle of the widest
 * stretch of the box along the centroid's own latitude, which is inside
 * however the box bends. A ring with no inside (under three corners, or no
 * area) keeps its centroid.
 */
export function boxCentre(ring: Ring): LngLat {
  const centroid = ringCentroid(ring);
  if (ring.length < 3 || pointInRing(centroid, ring)) return centroid;
  const y = centroid[1];
  // Where the ring's edges cross the latitude, west to east: each pair, in
  // turn, is a stretch inside. Half-open, so a corner on it counts once.
  const crossings: number[] = [];
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (yi > y !== yj > y) crossings.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
  }
  crossings.sort((a, b) => a - b);
  let best: LngLat = centroid;
  let widest = 0;
  for (let k = 0; k + 1 < crossings.length; k += 2) {
    const width = crossings[k + 1] - crossings[k];
    if (width > widest) {
      widest = width;
      best = [(crossings[k] + crossings[k + 1]) / 2, y];
    }
  }
  return best;
}

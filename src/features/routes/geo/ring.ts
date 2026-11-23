import {
  bboxContains,
  bboxMeetsSegment,
  bboxOf,
  bboxesOverlap,
  lineBounds,
  pointToSegmentM,
  type LngLat,
} from '@/shared/utils/geo';

/*
 * Rings: a hotspot's outline, and what a line does to it. A ring is the list
 * of corner points in order, NOT closed: the edge from the last point back to
 * the first is implied. Hotspots are a few hundred metres across at most, so
 * plain lng/lat arithmetic is used throughout; at that scale the difference
 * from a proper projection is far below click precision.
 */

/** Polygon corners in order; the closing edge is implied. */
export type Ring = LngLat[];

/**
 * Point-in-polygon by ray casting. A point exactly on an edge counts as
 * inside: a hotspot traced along a kerb should still claim a route running on
 * that kerb.
 */
export function pointInRing(p: LngLat, ring: Ring): boolean {
  const n = ring.length;
  if (n < 3) return false;
  const [px, py] = p;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if (onSegment(p, ring[i], ring[j])) return true;
    const crosses = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** How near zero a cross product or an area counts as zero, in square degrees. */
export const EPS = 1e-12;

function orient([ax, ay]: LngLat, [bx, by]: LngLat, [cx, cy]: LngLat): number {
  const v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  return Math.abs(v) < EPS ? 0 : Math.sign(v);
}

function onSegment(p: LngLat, a: LngLat, b: LngLat): boolean {
  if (orient(a, b, p) !== 0) return false;
  return (
    Math.min(a[0], b[0]) - EPS <= p[0] &&
    p[0] <= Math.max(a[0], b[0]) + EPS &&
    Math.min(a[1], b[1]) - EPS <= p[1] &&
    p[1] <= Math.max(a[1], b[1]) + EPS
  );
}

/** Do segments a–b and c–d touch or cross, including collinear overlap? */
export function segmentsIntersect(a: LngLat, b: LngLat, c: LngLat, d: LngLat): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 !== o2 && o3 !== o4) return true;
  if (o1 === 0 && onSegment(c, a, b)) return true;
  if (o2 === 0 && onSegment(d, a, b)) return true;
  if (o3 === 0 && onSegment(a, c, d)) return true;
  if (o4 === 0 && onSegment(b, c, d)) return true;
  return false;
}

/**
 * Where along the line the polygon is first touched: the index of the first
 * vertex inside it, or, when the line crosses between two vertices, the index
 * of the vertex just before that crossing. -1 when they never meet.
 *
 * This is what `route_stop.sequence` stores. The second case matters: a
 * snapped road has a vertex every ~20–30 m, so a narrow hotspot drawn across
 * a straight stretch can sit entirely between two vertices.
 */
export function firstTouchIndex(line: readonly LngLat[], ring: Ring): number {
  if (ring.length < 3 || line.length === 0) return -1;
  // A vertex inside the ring is inside its box, and a segment that crosses
  // its edge reaches its box: the cheap questions first, and none of the
  // dear ones for a line whose own box is nowhere near (lineBounds).
  const box = bboxOf(ring);
  if (!bboxesOverlap(lineBounds(line), box)) return -1;
  const n = ring.length;
  for (let i = 0; i < line.length; i++) {
    if (bboxContains(box, line[i]) && pointInRing(line[i], ring)) return i;
    if (i === 0 || !bboxMeetsSegment(box, line[i - 1], line[i])) continue;
    for (let j = 0; j < n; j++) {
      if (segmentsIntersect(line[i - 1], line[i], ring[j], ring[(j + 1) % n])) return i - 1;
    }
  }
  return -1;
}

/** Metres from p to the polygon's edge (0 inside it). */
export function distanceToRingM(p: LngLat, ring: Ring): number {
  if (pointInRing(p, ring)) return 0;
  const n = ring.length;
  let best = Infinity;
  for (let j = 0; j < n; j++) best = Math.min(best, pointToSegmentM(p, ring[j], ring[(j + 1) % n]));
  return best;
}

/**
 * The convex hull of some points (Andrew's monotone chain), as a ring. Fewer
 * than three distinct points give back what was passed. Used for the wash
 * that joins the boxes of one place on the map.
 */
export function convexHull(points: LngLat[]): Ring {
  const pts = [...new Map(points.map((p) => [p.join(','), p])).values()].sort(
    (a, b) => a[0] - b[0] || a[1] - b[1],
  );
  if (pts.length < 3) return pts;
  const cross = (o: LngLat, a: LngLat, b: LngLat) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: LngLat[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: LngLat[] = [];
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** GeoJSON Polygon with the ring closed, as the database and MapLibre want it. */
export function ringToPolygon(ring: Ring): { type: 'Polygon'; coordinates: LngLat[][] } {
  const closed = ring.length > 0 ? [...ring, ring[0]] : [];
  return { type: 'Polygon', coordinates: [closed] };
}

/** The corners back out of a stored GeoJSON Polygon (drops the closing point). */
export function polygonToRing(poly: { coordinates: LngLat[][] } | null | undefined): Ring {
  const outer = poly?.coordinates?.[0] ?? [];
  if (outer.length < 2) return outer;
  const [fx, fy] = outer[0];
  const [lx, ly] = outer[outer.length - 1];
  return fx === lx && fy === ly ? outer.slice(0, -1) : outer;
}

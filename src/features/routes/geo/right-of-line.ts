import { bboxMeetsSegment, bboxOf, type LngLat } from '@/shared/utils/geo';

import { pointInRing, type Ring } from './ring';

/* The babaan side: a box's half on a line's right. */

/**
 * Twice the signed area, in degrees²: positive when the ring runs
 * anticlockwise. Measured from the first corner: a box of a few metres at
 * 121°E is lost in the rounding when each product is taken from 0°.
 */
function signedArea2(ring: Ring): number {
  const [ox, oy] = ring[0];
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += (ring[j][0] - ox) * (ring[i][1] - oy) - (ring[i][0] - ox) * (ring[j][1] - oy);
  return a;
}

/** How far a point is from the nearest of the ring's edges, in degrees. */
function distanceToEdges(p: LngLat, ring: Ring): number {
  let best = Infinity;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [a, b] = [ring[j], ring[i]];
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const len2 = dx * dx + dy * dy;
    const t =
      len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
    best = Math.min(best, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  }
  return best;
}

/**
 * The part of the ring on the line's right, walking the line forward: the
 * ring cut along the first stretch of the line inside it. A line that starts
 * or ends inside is carried on straight until it is out, so a tail that stops
 * in the box still cuts it. Null when the line never goes inside — a box
 * beside the road has nothing to cut.
 *
 * Works in plain degrees: which side of a line a point is on, and where two
 * segments cross, do not change when longitude is stretched.
 */
export function rightOfLine(ring: Ring, line: readonly LngLat[]): Ring | null {
  const n = ring.length;
  if (n < 3 || line.length < 2) return null;
  const [w, s, e, nn] = bboxOf(ring);
  const reach = 2 * Math.hypot(e - w, nn - s);
  const carry = (from: LngLat, to: LngLat): LngLat => {
    const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
    const len = Math.hypot(dx, dy);
    return len === 0 ? to : [to[0] + (dx / len) * reach, to[1] + (dy / len) * reach];
  };
  // Carried on from the nearest point that is not the end itself: a line
  // whose end is repeated (a last click made twice) would give carry a
  // zero-length step, which carries nothing, and the tail in the box would
  // cut nothing. Found by walking the line from each end, and the line copied
  // only when a carry is added: a copy and a reversed copy of it for every
  // box it is asked about were most of the time a trip's babaan sides took
  // (measured). A line whose every point is its last has no point before
  // either end, and carries neither.
  const same = (p: LngLat, q: LngLat) => p[0] === q[0] && p[1] === q[1];
  const first = line[0];
  const last = line[line.length - 1];
  let afterFirst = 1;
  while (afterFirst < line.length && same(line[afterFirst], first)) afterFirst++;
  const head =
    afterFirst < line.length && pointInRing(first, ring) ? carry(line[afterFirst], first) : null;
  let beforeLast = line.length - 2;
  while (beforeLast >= 0 && same(line[beforeLast], last)) beforeLast--;
  const tail = beforeLast >= 0 && pointInRing(last, ring) ? carry(line[beforeLast], last) : null;
  const path = head || tail ? [...(head ? [head] : []), ...line, ...(tail ? [tail] : [])] : line;
  // A segment that does not reach the box crosses none of its edges. A metre
  // wider than the box, so one that rounding could call a crossing is never
  // passed over.
  const near = bboxOf(ring, 1);

  // Every place the path crosses an edge, in travel order. `at` is where on
  // the ring: edge index plus how far along it.
  const hits: { k: number; t: number; at: number; p: LngLat }[] = [];
  for (let k = 0; k + 1 < path.length; k++) {
    const [a, b] = [path[k], path[k + 1]];
    if (!bboxMeetsSegment(near, a, b)) continue;
    for (let i = 0; i < n; i++) {
      const [c, d] = [ring[i], ring[(i + 1) % n]];
      const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
      if (den === 0) continue;
      const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
      const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / den;
      if (t < 0 || t >= 1 || u < 0 || u >= 1) continue;
      hits.push({ k, t, at: i + u, p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] });
    }
  }
  hits.sort((x, y) => x.k - y.k || x.t - y.t);

  // Each pass through the box: a pair of crossings with the box between them, not a corner grazed.
  const passes: { into: (typeof hits)[number]; out: (typeof hits)[number] }[] = [];
  for (let j = 0; j + 1 < hits.length; j++) {
    const [into, out] = [hits[j], hits[j + 1]];
    const next = out.k === into.k ? out.p : path[into.k + 1];
    if (pointInRing([(into.p[0] + next[0]) / 2, (into.p[1] + next[1]) / 2], ring))
      passes.push({ into, out });
  }
  // A line through the box more than once that starts or ends in it (a route from this hintuan
  // that passes it again) is cut along the pass at its end, so walked either way it is cut along
  // the same pass and the two directions' halves make the box. Any other line, along its first.
  // An end on the box's edge is left out: there the crossings found walking one way and the other
  // need not pair alike, and the first pass, as before, is kept.
  const clear = reach * 1e-6;
  const wellInside = (p: LngLat) => distanceToEdges(p, ring) > clear;
  const atEnd = ({ into, out }: (typeof passes)[number]) =>
    (head !== null && into.k === 0 && wellInside(first)) ||
    (tail !== null && out.k === path.length - 2 && wellInside(last));
  const ends = passes.length > 1 ? passes.filter(atEnd) : [];
  const pass = ends.length === 1 ? ends[0] : passes[0];
  if (!pass) return null;

  const { into, out } = pass;
  const d = (((into.at - out.at) % n) + n) % n;
  if (d === 0) return null;
  const cut = [into.p, ...path.slice(into.k + 1, out.k + 1), out.p];
  // Back from where the line leaves to where it came in, one way round the ring or the other.
  const forward: LngLat[] = [];
  for (let v = Math.floor(out.at) + 1; v - out.at < d; v++) forward.push(ring[v % n]);
  const backward: LngLat[] = [];
  for (let v = Math.ceil(out.at) - 1; out.at - v < n - d; v--)
    backward.push(ring[((v % n) + n) % n]);
  // Walking the cut with the piece on the right is walking it clockwise.
  const a = [...cut, ...forward];
  return signedArea2(a) < 0 ? a : [...cut, ...backward];
}

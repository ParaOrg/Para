import type { LngLat, Segment } from '@/shared/utils/geo';

/*
 * Curves in Draw, the way a pen tool makes them: a Draw stretch may bend as a
 * cubic Bézier, its two handles kept on the segment (`handles`) and the curve
 * flattened into its `coordinates`, so the line, the save's shape and the
 * publish read a polyline as they always have. Only Draw's (freehand)
 * stretches bend, never a routed one. Pure, so tests/unit/curves-test.mjs can
 * hold it. Lng/lat are treated as flat: a jeepney's stretch is a street long.
 */

/** Points a curve is flattened into, its two ends among them: smooth at street zoom, light in a save. */
export const CURVE_STEPS = 24;

const same = (a: LngLat, b: LngLat) => a[0] === b[0] && a[1] === b[1];

/** `handle` turned half round `about`: a smooth point's other handle. */
export function mirror(handle: LngLat, about: LngLat): LngLat {
  return [2 * about[0] - handle[0], 2 * about[1] - handle[1]];
}

/** The point at `t` (0–1) of the cubic from `a` to `b` with handles `c1`, `c2`. */
function cubicAt(a: LngLat, c1: LngLat, c2: LngLat, b: LngLat, t: number): LngLat {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [
    w[0] * a[0] + w[1] * c1[0] + w[2] * c2[0] + w[3] * b[0],
    w[0] * a[1] + w[1] * c1[1] + w[2] * c2[1] + w[3] * b[1],
  ];
}

/**
 * A Draw stretch from `from` to `to`, bent by `c1` (from's handle) and `c2`
 * (to's). With both handles on their points it is straight, and kept as a
 * plain straight stretch.
 */
export function curveSegment(from: LngLat, to: LngLat, c1: LngLat, c2: LngLat): Segment {
  if (same(c1, from) && same(c2, to)) return { snap: 'freehand', coordinates: [from, to] };
  const coordinates: LngLat[] = [from];
  for (let i = 1; i < CURVE_STEPS - 1; i++)
    coordinates.push(cubicAt(from, c1, c2, to, i / (CURVE_STEPS - 1)));
  coordinates.push(to);
  return { snap: 'freehand', coordinates, handles: [c1, c2] };
}

/**
 * A Draw stretch redrawn between `from` and `to`: bent by the handles it
 * has, else straight. What a stretch becomes when its ends move and it is
 * not routed.
 */
export function bend(segment: Segment | undefined, from: LngLat, to: LngLat): Segment {
  const handles = segment?.snap === 'freehand' ? segment.handles : undefined;
  return handles
    ? curveSegment(from, to, handles[0], handles[1])
    : { snap: 'freehand', coordinates: [from, to] };
}

/**
 * The handle at one end of a stretch moved with its point: the end at `from`
 * (`atStart`) or at `to`, shifted by how far that point moved.
 */
export function carryHandles(
  segment: Segment | undefined,
  atStart: boolean,
  was: LngLat,
  now: LngLat,
): Segment['handles'] {
  const handles = segment?.snap === 'freehand' ? segment.handles : undefined;
  if (!handles) return undefined;
  const dx = now[0] - was[0];
  const dy = now[1] - was[1];
  const [c1, c2] = handles;
  return atStart ? [[c1[0] + dx, c1[1] + dy], c2] : [c1, [c2[0] + dx, c2[1] + dy]];
}

/**
 * A curve split at the vertex of its flattened line nearest `point`, by de
 * Casteljau: two curves that together trace the one, meeting at that vertex.
 * Null for a stretch with no handles, which splits as any other.
 */
export function splitCurve(segment: Segment, point: LngLat): [Segment, Segment] | null {
  const handles = segment.snap === 'freehand' ? segment.handles : undefined;
  const line = segment.coordinates;
  if (!handles || line.length < 3) return null;
  let at = 1;
  let best = Infinity;
  for (let i = 1; i < line.length - 1; i++) {
    const d = (line[i][0] - point[0]) ** 2 + (line[i][1] - point[1]) ** 2;
    if (d < best) {
      best = d;
      at = i;
    }
  }
  const t = at / (line.length - 1);
  const a = line[0];
  const b = line[line.length - 1];
  const [c1, c2] = handles;
  const lerp = (p: LngLat, q: LngLat): LngLat => [
    p[0] + (q[0] - p[0]) * t,
    p[1] + (q[1] - p[1]) * t,
  ];
  const ab = lerp(a, c1);
  const bc = lerp(c1, c2);
  const cd = lerp(c2, b);
  const abc = lerp(ab, bc);
  const bcd = lerp(bc, cd);
  const mid = lerp(abc, bcd);
  return [curveSegment(a, mid, ab, abc), curveSegment(mid, b, bcd, cd)];
}

/**
 * Two stretches healed into one when the point between them goes: a curve
 * keeping the outer handles of whichever of them bent, else straight.
 */
export function mergeAcross(
  before: Segment | undefined,
  after: Segment | undefined,
  from: LngLat,
  to: LngLat,
): Segment | null {
  const c1 = before?.snap === 'freehand' ? before.handles?.[0] : undefined;
  const c2 = after?.snap === 'freehand' ? after.handles?.[1] : undefined;
  if (!c1 && !c2) return null;
  return curveSegment(from, to, c1 ?? from, c2 ?? to);
}

/**
 * The handle a point sends its next stretch: `pending`, the drag that placed
 * it, while it is that point's; else the mirror of the handle its stretch in
 * arrives with, when that one bends at it (a smooth point, read back from a
 * draft); else none, a corner.
 */
export function outHandle(
  point: LngLat,
  incoming: Segment | undefined,
  pending: { point: LngLat; out: LngLat } | null,
): LngLat | null {
  if (pending && pending.point === point) return pending.out;
  const c2 = incoming?.snap === 'freehand' ? incoming.handles?.[1] : undefined;
  return c2 && !same(c2, point) ? mirror(c2, point) : null;
}

import type { LngLat, Segment } from '@/shared/utils/geo';

import { curveSegment, isOnPoint, mirror } from './curves';

/*
 * A curve's handles moved after it is drawn: one dragged (its partner across
 * the point mirroring it, or not, with Alt), and a point switched between
 * corner and smooth. Pure, held by tests/unit/curves-test.mjs.
 */

/** A handle of a stretch: which stretch, and at its start (0) or its end (1). */
export interface HandleRef {
  /** The stretch's index. */
  seg: number;
  end: 0 | 1;
}

/** The stretch with one handle set, redrawn; a routed one is left as it is. */
function withHandle(segment: Segment | undefined, end: 0 | 1, to: LngLat): Segment | undefined {
  if (!segment || segment.snap !== 'freehand' || segment.coordinates.length < 2) return segment;
  const from = segment.coordinates[0];
  const last = segment.coordinates[segment.coordinates.length - 1];
  const [c1, c2] = segment.handles ?? [from, last];
  return end === 0 ? curveSegment(from, last, to, c2) : curveSegment(from, last, c1, to);
}

/**
 * A handle dragged to `to`: its stretch bends to it, and the handle across the
 * point from it turns to mirror it, keeping the point smooth, unless it moves
 * `alone` (Alt). Only Draw stretches change.
 */
export function moveHandle(
  segments: readonly Segment[],
  { seg, end }: HandleRef,
  to: LngLat,
  isAlone: boolean,
): Segment[] {
  const next = [...segments];
  const moved = withHandle(next[seg], end, to);
  // A routed stretch has no handles to move, and turns no partner.
  if (!moved || moved === next[seg]) return next;
  next[seg] = moved;
  if (isAlone) return next;
  const point = end === 0 ? moved.coordinates[0] : moved.coordinates[moved.coordinates.length - 1];
  const across = end === 0 ? seg - 1 : seg + 1;
  const partner = withHandle(next[across], end === 0 ? 1 : 0, mirror(to, point));
  if (partner) next[across] = partner;
  return next;
}

/** The handle at point `i` on its Draw stretches: the one in, and the one out. */
function handlesAt(segments: readonly Segment[], i: number): (LngLat | null)[] {
  const into = segments[i - 1];
  const outOf = segments[i];
  return [
    into?.snap === 'freehand' ? (into.handles?.[1] ?? null) : null,
    outOf?.snap === 'freehand' ? (outOf.handles?.[0] ?? null) : null,
  ];
}

/**
 * Point `i` switched between corner and smooth (a double-click): a smooth
 * point's handles fold onto it, a corner; a corner gets handles along the
 * line's way through it, each a third of its stretch long, smooth. Only the
 * Draw stretches either side change.
 */
export function toggleSmooth(
  segments: readonly Segment[],
  points: readonly LngLat[],
  i: number,
): readonly Segment[] {
  const point = points[i];
  if (!point) return segments;
  const isSmooth = handlesAt(segments, i).some((h) => h && !isOnPoint(h, point));
  const prev = points[i - 1] ?? point;
  const nextPoint = points[i + 1] ?? point;
  const way: LngLat = [nextPoint[0] - prev[0], nextPoint[1] - prev[1]];
  const length = Math.hypot(way[0], way[1]) || 1;
  const reach = (to: LngLat) => Math.hypot(to[0] - point[0], to[1] - point[1]) / 3;
  const along = (sign: 1 | -1, to: LngLat): LngLat => [
    point[0] + (sign * way[0] * reach(to)) / length,
    point[1] + (sign * way[1] * reach(to)) / length,
  ];
  const into = withHandle(segments[i - 1], 1, isSmooth ? point : along(-1, prev));
  const outOf = withHandle(segments[i], 0, isSmooth ? point : along(1, nextPoint));
  // Nothing of Draw's beside it: the same array, so nothing is written and Redo stays.
  if (into === segments[i - 1] && outOf === segments[i]) return segments;
  const next = [...segments];
  if (into) next[i - 1] = into;
  if (outOf) next[i] = outOf;
  return next;
}

/** A grab nearer an end than this share of the stretch bends it as if from here: the handles stay in reach. */
const GRAB_EDGE = 0.15;

/** Where on a Draw stretch a press took hold: the share of the way along its line, 0–1, by projection. */
export function grabAt(segment: Segment, at: LngLat): number {
  const line = segment.coordinates;
  let walked = 0;
  let best = { d: Infinity, along: 0 };
  for (let i = 1; i < line.length; i++) {
    const [a, b] = [line[i - 1], line[i]];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const span = Math.hypot(dx, dy);
    const u =
      span > 0
        ? Math.min(1, Math.max(0, ((at[0] - a[0]) * dx + (at[1] - a[1]) * dy) / span ** 2))
        : 0;
    const d = Math.hypot(a[0] + dx * u - at[0], a[1] + dy * u - at[1]);
    if (d < best.d) best = { d, along: walked + u * span };
    walked += span;
  }
  return walked > 0 ? best.along / walked : 0;
}

/**
 * A Draw stretch dragged by its line: `grabbed` is the stretch as it was when
 * the press took hold at `t` of the way along, `by` how far the press has moved.
 * Both handles move, each by its share, so the curve passes through the
 * pointer, its ends staying put; the points either side keep their other
 * handles. A routed stretch never bends.
 */
export function bendThrough(grabbed: Segment, t: number, by: LngLat): Segment {
  if (grabbed.snap !== 'freehand' || grabbed.coordinates.length < 2) return grabbed;
  const from = grabbed.coordinates[0];
  const to = grabbed.coordinates[grabbed.coordinates.length - 1];
  const [c1, c2] = grabbed.handles ?? [from, to];
  const s = Math.min(1 - GRAB_EDGE, Math.max(GRAB_EDGE, t));
  // B(s) moves by w1·Δc1 + w2·Δc2; with Δc1 = k(1−s)·by and Δc2 = k·s·by, k makes that exactly `by`.
  const k = 1 / (3 * s * (1 - s) * ((1 - s) ** 2 + s ** 2));
  const shift = (c: LngLat, share: number): LngLat => [c[0] + by[0] * share, c[1] + by[1] * share];
  return curveSegment(from, to, shift(c1, k * (1 - s)), shift(c2, k * s));
}

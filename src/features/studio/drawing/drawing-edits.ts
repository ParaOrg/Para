import type { LngLat, Segment, SnapMode } from '@/shared/utils/geo';

import { straightSegment } from './snap';

/**
 * The array arithmetic behind the drawing's edits, pure: given the control
 * points and segments as they are, what they become and which gaps the
 * router must then be asked for. useDrawing writes the result (writePoints,
 * writeSegments) and asks (resolveGaps); the map's handlers never see this
 * file. Every function splices the very point objects it was given, never
 * copies: the join point and a right-click's join are held by identity
 * (joinRef, connectedRef in use-drawing.ts), and `indexOf` must keep finding them.
 */

export interface Edit {
  points: LngLat[];
  segments: Segment[];
  /** The gaps the router must be asked for after this edit, or null. */
  resolve: { from: number; modes: SnapMode[] } | null;
}

/**
 * addPoint before a borrowed end: the new point goes in just ahead of the
 * join at `join`, and both gaps it touches are new drawing in `mode`.
 */
export function addBeforeJoin(
  points: LngLat[],
  segments: Segment[],
  join: number,
  point: LngLat,
  mode: SnapMode,
): Edit {
  const pts = [...points];
  pts.splice(join, 0, point);
  const segs = [...segments];
  if (join === 0) segs.unshift(straightSegment(point, pts[1]));
  else
    segs.splice(
      join - 1,
      1,
      straightSegment(pts[join - 1], point),
      straightSegment(point, pts[join + 1]),
    );
  return {
    points: pts,
    segments: segs,
    resolve: { from: join === 0 ? 0 : join - 1, modes: join === 0 ? [mode] : [mode, mode] },
  };
}

/** insertPoint: split gap `gap` by dropping `point` into it, both halves in the gap's own mode. */
export function insertInGap(
  points: LngLat[],
  segments: Segment[],
  gap: number,
  point: LngLat,
): Edit {
  const mode: SnapMode = segments[gap]?.snap ?? 'snapped';
  const pts = [...points];
  pts.splice(gap + 1, 0, point);
  const segs = [...segments];
  segs.splice(gap, 1, straightSegment(pts[gap], point), straightSegment(point, pts[gap + 2]));
  return { points: pts, segments: segs, resolve: { from: gap, modes: [mode, mode] } };
}

/**
 * deletePoint: remove point `idx`, healing the two segments round it into
 * one, asked for in the mode of the gap before it, else the one after, else
 * snapped. An end point takes its one gap with it and asks for nothing.
 */
export function removeAt(points: LngLat[], segments: Segment[], idx: number): Edit {
  const origLen = points.length;
  const modeBefore = segments[idx - 1]?.snap;
  const modeAfter = segments[idx]?.snap;

  const pts = [...points];
  pts.splice(idx, 1);

  const segs = [...segments];
  if (idx === 0) segs.splice(0, 1);
  else if (idx === origLen - 1) segs.splice(segs.length - 1, 1);
  else segs.splice(idx - 1, 2, straightSegment(pts[idx - 1], pts[idx]));

  const resolve =
    idx > 0 && idx < pts.length
      ? { from: idx - 1, modes: [modeBefore ?? modeAfter ?? 'snapped'] }
      : null;
  return { points: pts, segments: segs, resolve };
}

/** loadArea: a ring's edges as straight segments, one fewer than its corners. */
export function ringSegments(ring: LngLat[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 1; i < ring.length; i++) segs.push(straightSegment(ring[i - 1], ring[i]));
  return segs;
}

/**
 * The runs of adjacent gaps `isWaiting` says are still waiting for the
 * router, as [from, to] pairs of gap indices, each run one request. putBack
 * asks for the stand-ins a Delete called off, and the draft's restore for the
 * gaps marked pending; which modes to ask in stays each caller's.
 */
export function waitingRuns<T extends Segment>(
  segments: T[],
  isWaiting: (s: T) => boolean,
): [number, number][] {
  const runs: [number, number][] = [];
  let from = -1;
  segments.forEach((s, i) => {
    const waiting = !!s && isWaiting(s);
    if (waiting && from === -1) from = i;
    if (from === -1 || (waiting && i < segments.length - 1)) return;
    runs.push([from, waiting ? i : i - 1]);
    from = -1;
  });
  return runs;
}

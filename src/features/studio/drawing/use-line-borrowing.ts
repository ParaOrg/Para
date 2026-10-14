import { useCallback, type RefObject } from 'react';

import { coarsePointer } from '@/features/routes/map/tap';
import type { DirectionDrawing } from '@/features/routes/model/routes';
import type { LngLat, Segment, SnapMode } from '@/shared/utils/geo';

import { cutAt, nearestSpot, reverseDrawing, type BorrowPart } from './borrow';
import type { AreaTarget, Borrow, Picking } from './drawing-types';
import { straightSegment } from './snap';

/**
 * The half of the drawing that borrows from a saved line: Extend's `keep` of
 * one side of the picked spot, and a right-click's `connect`, which joins a
 * saved direction and follows it to its end, with the `joinGate` the studio
 * asks before fetching that line's drawing. The three are the only callers
 * of borrow.ts's cut, spot and reverse. Starting an Extend (`startExtend`)
 * stays with the modes in use-drawing.ts: it starts a drawing, these edit
 * one. The drawing's refs and mutators are passed in, not owned, as
 * useGapResolver's are; the map's handlers read the same refs between
 * renders, so the join point and a join's ends are written to them here.
 */
export function useLineBorrowing(
  refs: {
    points: RefObject<LngLat[]>;
    segments: RefObject<Segment[]>;
    area: RefObject<AreaTarget | null>;
    picking: RefObject<Picking | null>;
    join: RefObject<LngLat | null>;
    borrow: RefObject<Borrow | null>;
    connected: RefObject<{ spot: LngLat; end: LngLat } | null>;
    freehand: RefObject<boolean>;
  },
  actions: {
    writePoints: (pts: LngLat[]) => void;
    writeSegments: (next: Segment[]) => void;
    resolveGaps: (first: number, modes: SnapMode[]) => Promise<void>;
    setBorrow: (b: Borrow | null) => void;
    setPicking: (p: Picking | null) => void;
  },
) {
  const {
    points: cpRef,
    segments: segRef,
    area: areaRef,
    picking: pickingRef,
    join: joinRef,
    borrow: borrowRef,
    connected: connectedRef,
    freehand: freehandRef,
  } = refs;
  const { writePoints, writeSegments, resolveGaps, setBorrow, setPicking } = actions;

  /**
   * Take over one side of the picked spot. The kept part becomes ordinary
   * control points and segments — a copy, editable like any drawing. Keeping
   * the start, new clicks carry on from the spot; keeping the end, they are
   * drawn from where the new route starts and join it at the spot.
   */
  const keep = useCallback(
    (part: BorrowPart) => {
      const p = pickingRef.current;
      if (!p?.spot) return;
      const cut = cutAt(p.direction.controlPoints ?? [], p.direction.segments ?? [], p.spot, part);
      writePoints(cut.controlPoints);
      writeSegments(cut.segments);
      joinRef.current = part === 'end' ? (cut.controlPoints[0] ?? null) : null;
      setBorrow({ directionId: p.direction.id, part });
      setPicking(null);
      pickingRef.current = null;
    },
    [pickingRef, joinRef, writePoints, writeSegments, setBorrow, setPicking],
  );

  /**
   * Whether a join can start now, asked before the line's drawing is fetched
   * (live.ts withDrawing), so the owner hears "draw first" at once rather
   * than after a request. `go` false with no problem: nothing to say, as when
   * tracing a hotspot. `connect` asks the same again when the drawing lands.
   */
  const joinGate = useCallback((): { go: boolean; problem: string | null } => {
    if (areaRef.current || pickingRef.current) return { go: false, problem: null };
    if (cpRef.current.length === 0) {
      return {
        go: false,
        problem: coarsePointer()
          ? 'Draw from where the jeep starts first, then tap the line it joins and follow it.'
          : 'Draw from where the jeep starts first, then right-click the line it joins.',
      };
    }
    if (joinRef.current || borrowRef.current) {
      return {
        go: false,
        problem: 'This drawing already follows part of another line. One per drawing, for now.',
      };
    }
    return { go: true, problem: null };
  }, [areaRef, pickingRef, cpRef, joinRef, borrowRef]);

  /**
   * Join a saved direction where the owner right-clicked it, and follow it to
   * its end: a routed gap from the drawing's last point to the spot, then a
   * copy of the rest of that line. For a return trip that meets another
   * route's line and rides it home. `backwards` when that line was stored
   * from its far end, so the copy is turned to run the way the jeep goes.
   * `drop`, from the follow offer: the point the finger's tap added, which
   * the join replaces, taken out only once the join goes ahead.
   *
   * Returns a sentence for the owner when it cannot join, or null.
   */
  const connect = useCallback(
    (v: DirectionDrawing, at: LngLat, backwards: boolean, drop?: LngLat): string | null => {
      const gate = joinGate();
      if (!gate.go) return gate.problem;
      const cp = v.controlPoints ?? [];
      const segs = v.segments ?? [];
      const src = backwards ? reverseDrawing(cp, segs) : { controlPoints: cp, segments: segs };
      const spot = nearestSpot(src.segments, at);
      if (!spot) return null;
      const cut = cutAt(src.controlPoints, src.segments, spot, 'end');
      if (cut.segments.length === 0)
        return 'That is the very end of the line: nothing left to follow.';

      const dropping =
        !!drop && cpRef.current.length > 1 && cpRef.current[cpRef.current.length - 1] === drop;
      const mine = dropping ? cpRef.current.slice(0, -1) : cpRef.current;
      const mineSegs = dropping ? segRef.current.slice(0, -1) : segRef.current;
      const gap = mine.length - 1;
      const last = mine[gap];
      writePoints([...mine, ...cut.controlPoints]);
      writeSegments([...mineSegs, straightSegment(last, cut.controlPoints[0]), ...cut.segments]);
      connectedRef.current = {
        spot: cut.controlPoints[0],
        end: cut.controlPoints[cut.controlPoints.length - 1],
      };
      setBorrow({ directionId: v.id, part: 'end' });
      void resolveGaps(gap, [freehandRef.current ? 'freehand' : 'snapped']);
      return null;
    },
    [
      joinGate,
      cpRef,
      segRef,
      connectedRef,
      freehandRef,
      resolveGaps,
      writePoints,
      writeSegments,
      setBorrow,
    ],
  );

  return { keep, joinGate, connect };
}

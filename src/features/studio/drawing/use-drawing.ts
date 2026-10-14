import type { MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { coarsePointer } from '@/features/routes/map/tap';
import type { DirectionDrawing } from '@/features/routes/model/routes';
import {
  joinSegments,
  lineLength,
  type LngLat,
  type Segment,
  type SnapMode,
} from '@/shared/utils/geo';

import { cutAt, nearestSpot, reverseDrawing, type BorrowPart } from './borrow';
import { readDraft, restoredState, useDraftSaving } from './draft';
import { useDrawLayers, useDrawRendering } from './draw-layers';
import { addBeforeJoin, insertInGap, removeAt, ringSegments } from './drawing-edits';
import type { AreaTarget, Borrow, HotspotKind, Picking, Target } from './drawing-types';
import { useGapResolver } from './gap-resolver';
import { straightSegment } from './snap';
import { useDrawEvents } from './use-draw-events';
import { usePointBar } from './use-point-bar';
import { findUTurns } from './uturns';

/**
 * The drawing tool: a route's control points and the road between them, or a
 * hotspot's outline, from the first click to the save. This file keeps the
 * state, the edits and the modes; what it paints is drawLayers.ts, how the
 * pointer drives it useDrawEvents.ts, the router's answers gapResolver.ts,
 * and the draft on this device draft.ts (split 2026-09-29, stage 10 of the
 * clean-up; nothing it does changed).
 */

export type Drawing = ReturnType<typeof useDrawing>;

export function useDrawing(
  map: MapLibreMap | null,
  opts: {
    /**
     * A right-click on saved lines while drawing a route: the directions under
     * it and where. The studio decides which one is meant and calls `connect`.
     */
    onFollow?: (directionIds: string[], at: LngLat, offered?: LngLat) => void;
  } = {},
) {
  const [drawing, setDrawing] = useState(false);
  const [controlPoints, setControlPoints] = useState<LngLat[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [freehand, setFreehand] = useState(false);
  /** What a save will write to: an existing direction, a new direction on an
   *  existing route, or (both null) a brand-new route. */
  const [target, setTarget] = useState<Target>({
    routeId: null,
    directionId: null,
  });
  /** Non-null while tracing a hotspot rather than a route. */
  const [area, setArea] = useState<AreaTarget | null>(null);
  /** Non-null once part of a saved direction has been taken over (Extend). */
  const [borrow, setBorrow] = useState<Borrow | null>(null);
  /** Non-null while choosing where a new route leaves a saved direction. */
  const [picking, setPicking] = useState<Picking | null>(null);
  /** The point a finger tapped, whose bar of actions is open (PointBar.tsx). */
  const [selected, setSelected] = useState<number | null>(null);

  // Map event handlers are registered once and must always see current state,
  // so every mutator updates these refs synchronously.
  const cpRef = useRef<LngLat[]>([]);
  const segRef = useRef<Segment[]>([]);
  const freehandRef = useRef(false);
  const areaRef = useRef<AreaTarget | null>(null);
  const pickingRef = useRef<Picking | null>(null);
  /**
   * The point where a kept *end* begins, when a new route joins a saved one
   * there. New clicks go in just before it rather than after the last point,
   * so the owner draws forwards — from where the jeep starts to where it
   * joins — and the line stays joined to the borrowed end the whole time.
   * Held by identity: a drag replaces it (see onDragMove); deleting it
   * returns the drawing to plain appending.
   */
  const joinRef = useRef<LngLat | null>(null);
  const borrowRef = useRef<Borrow | null>(null);
  const followRef = useRef(opts.onFollow);
  // The refs that mirror state or a prop also follow it on every commit, for
  // the setters that write no ref (setFreehand, setBorrow): in a layout effect,
  // before the map can fire another event, not during render, where a render
  // React throws away would leave its values behind.
  useLayoutEffect(() => {
    freehandRef.current = freehand;
    areaRef.current = area;
    pickingRef.current = picking;
    borrowRef.current = borrow;
    followRef.current = opts.onFollow;
  });
  const selectedRef = useRef<number | null>(null);
  /**
   * The first and last points a right-click added by joining a saved line.
   * While the last is still the drawing's last, Undo takes the whole join
   * back in one step rather than one borrowed point at a time.
   */
  const connectedRef = useRef<{ spot: LngLat; end: LngLat } | null>(null);

  // The segments and the router's answers for them.
  const gaps = useGapResolver(
    useMemo(() => ({ points: cpRef, segments: segRef, area: areaRef }), []),
    setSegments,
  );
  const { writeSegments, resolveGaps, isStandIn, markStandIn } = gaps;

  const select = useCallback((i: number | null) => {
    selectedRef.current = i;
    setSelected(i);
  }, []);

  // A point added or taken away moves every index after it, so a selection
  // lasts only while the drawing keeps its number of points.
  const writePoints = useCallback(
    (pts: LngLat[]) => {
      if (pts.length !== cpRef.current.length) select(null);
      cpRef.current = pts;
      setControlPoints(pts);
    },
    [select],
  );

  const addPoint = useCallback(
    async (point: LngLat) => {
      const mode: SnapMode = freehandRef.current ? 'freehand' : 'snapped';
      const join = joinRef.current ? cpRef.current.indexOf(joinRef.current) : -1;
      if (join !== -1 && !areaRef.current) {
        // Before a borrowed end: the new point goes in just ahead of the join,
        // and both gaps it touches are new drawing.
        const edit = addBeforeJoin(cpRef.current, segRef.current, join, point, mode);
        writePoints(edit.points);
        writeSegments(edit.segments);
        if (edit.resolve) await resolveGaps(edit.resolve.from, edit.resolve.modes);
        return;
      }
      const prevLen = cpRef.current.length;
      writePoints([...cpRef.current, point]);
      if (prevLen === 0) return;
      await resolveGaps(prevLen - 1, [mode]);
    },
    [resolveGaps, writePoints, writeSegments],
  );

  /** Split a segment by dropping a new control point into it. */
  const insertPoint = useCallback(
    async (gap: number, point: LngLat) => {
      const edit = insertInGap(cpRef.current, segRef.current, gap, point);
      writePoints(edit.points);
      writeSegments(edit.segments);
      if (edit.resolve) await resolveGaps(edit.resolve.from, edit.resolve.modes);
    },
    [resolveGaps, writePoints, writeSegments],
  );

  /** Remove a control point, healing the two segments around it into one. */
  const deletePoint = useCallback(
    async (idx: number) => {
      const edit = removeAt(cpRef.current, segRef.current, idx);
      writePoints(edit.points);
      writeSegments(edit.segments);
      if (edit.resolve) await resolveGaps(edit.resolve.from, edit.resolve.modes);
    },
    [resolveGaps, writePoints, writeSegments],
  );

  /**
   * Flip one segment between routed and straight. This is the escape hatch for
   * a stretch the router refuses, and the retry for one where it failed.
   */
  const toggleSegment = useCallback(
    async (gap: number) => {
      const current: SnapMode = segRef.current[gap]?.snap ?? 'snapped';
      await resolveGaps(gap, [current === 'snapped' ? 'freehand' : 'snapped']);
    },
    [resolveGaps],
  );

  const undo = useCallback(() => {
    // Straight after a join, Undo takes the whole join back.
    const joined = connectedRef.current;
    const pts = cpRef.current;
    if (joined && pts[pts.length - 1] === joined.end) {
      const at = pts.indexOf(joined.spot);
      if (at > 0) {
        connectedRef.current = null;
        writePoints(pts.slice(0, at));
        writeSegments(segRef.current.slice(0, at - 1));
        setBorrow(null);
        return;
      }
    }
    const join = joinRef.current ? cpRef.current.indexOf(joinRef.current) : -1;
    // Before a borrowed end, the last point drawn is the one just ahead of the
    // join. With none drawn yet there is nothing of the owner's to take back.
    if (join !== -1) {
      if (join > 0) void deletePoint(join - 1);
      return;
    }
    writePoints(cpRef.current.slice(0, -1));
    writeSegments(segRef.current.slice(0, -1));
  }, [deletePoint, writePoints, writeSegments]);

  // The finger's Delete, Put back and the follow offer. Called here so its Put
  // back timer keeps its place among the effects.
  const pointBar = usePointBar(
    useMemo(
      () => ({
        points: cpRef,
        segments: segRef,
        join: joinRef,
        connected: connectedRef,
        selected: selectedRef,
        follow: followRef,
      }),
      [],
    ),
    { deletePoint, writePoints, writeSegments, resolveGaps, isStandIn },
    controlPoints,
  );
  const { setFollowOffer, clear: clearPointBar } = pointBar;

  /** The drawing's line as it is now, without its last point when that is `drop`. */
  const lineNow = useCallback((drop?: LngLat) => {
    const last = cpRef.current[cpRef.current.length - 1];
    return joinSegments(drop && last === drop ? segRef.current.slice(0, -1) : segRef.current);
  }, []);

  const reset = useCallback(() => {
    writePoints([]);
    writeSegments([]);
    clearPointBar();
    setBorrow(null);
    setPicking(null);
    pickingRef.current = null;
    joinRef.current = null;
    connectedRef.current = null;
  }, [writePoints, writeSegments, clearPointBar]);

  /** Begin a new direction — of an existing route when routeId is given. */
  const start = useCallback(
    (routeId?: string | null) => {
      reset();
      setFreehand(false);
      setArea(null);
      areaRef.current = null;
      setTarget({ routeId: typeof routeId === 'string' ? routeId : null, directionId: null });
      setDrawing(true);
    },
    [reset],
  );

  /** Open a saved direction for editing: its row with its drawing (live.ts withDrawing). */
  const load = useCallback(
    (v: DirectionDrawing) => {
      reset();
      writePoints(v.controlPoints ?? []);
      writeSegments(v.segments ?? []);
      setFreehand(false);
      setArea(null);
      areaRef.current = null;
      setTarget({ routeId: v.routeId, directionId: v.id });
      setDrawing(true);
    },
    [reset, writePoints, writeSegments],
  );

  /**
   * Begin a new route from a saved direction (Extend): the owner taps where
   * the new route leaves it, then keeps the part before or after that spot.
   */
  const startExtend = useCallback(
    (v: DirectionDrawing) => {
      reset();
      setFreehand(false);
      setArea(null);
      areaRef.current = null;
      setTarget({ routeId: null, directionId: null });
      const p = { direction: v, spot: null };
      setPicking(p);
      pickingRef.current = p;
      setDrawing(true);
    },
    [reset],
  );

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
    [writePoints, writeSegments],
  );

  /**
   * Join a saved direction where the owner right-clicked it, and follow it to
   * its end: a routed gap from the drawing's last point to the spot, then a
   * copy of the rest of that line. For a return trip that meets another
   * route's line and rides it home. `backwards` when that line was stored
   * from its far end, so the copy is turned to run the way the jeep goes.
   *
   * Returns a sentence for the owner when it cannot join, or null.
   */
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
  }, []);

  /**
   * `drop`, from the follow offer: the point the finger's tap added, which
   * the join replaces, taken out only once the join goes ahead.
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
    [joinGate, resolveGaps, writePoints, writeSegments],
  );

  /** Begin tracing a hotspot outline. */
  const startArea = useCallback(
    (kind: HotspotKind) => {
      reset();
      setFreehand(false);
      const a = { kind, hotspotId: null };
      setArea(a);
      areaRef.current = a;
      setTarget({ routeId: null, directionId: null });
      setDrawing(true);
    },
    [reset],
  );

  /**
   * The outline being traced is now this saved hotspot: a save wrote its row
   * and failed after it (its links). Held in the area, so the panel closed
   * and opened again, or the page reloaded from its draft, updates that row
   * rather than inserting the box a second time (review of 2026-10-03).
   */
  const adoptHotspot = useCallback((hotspotId: string) => {
    const a = areaRef.current;
    if (!a || a.hotspotId === hotspotId) return;
    const next = { ...a, hotspotId };
    setArea(next);
    areaRef.current = next;
  }, []);

  /** Open a saved hotspot's outline for editing. */
  const loadArea = useCallback(
    (kind: HotspotKind, hotspotId: string, ring: LngLat[]) => {
      reset();
      const a = { kind, hotspotId };
      setArea(a);
      areaRef.current = a;
      writePoints(ring);
      writeSegments(ringSegments(ring));
      setFreehand(false);
      setTarget({ routeId: null, directionId: null });
      setDrawing(true);
    },
    [reset, writePoints, writeSegments],
  );

  const cancel = useCallback(() => {
    setDrawing(false);
    reset();
    setTarget({ routeId: null, directionId: null });
    setArea(null);
    areaRef.current = null;
  }, [reset]);

  // ------------------------------------------------------------------ draft

  // Once per page: development's StrictMode runs effects twice, which would ask
  // the router for every pending gap twice.
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const d = readDraft();
    if (!d) return;
    const restored = restoredState(d);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the draft is read from storage once per page, together with the router requests for its pending gaps below; lazy initial state would split the two and change useDraftSaving's first run
    setArea(restored.area);
    areaRef.current = restored.area;
    writePoints(restored.controlPoints);
    writeSegments(restored.segments);
    setTarget(restored.target);
    setBorrow(restored.borrow);
    joinRef.current = restored.join;
    setDrawing(true);

    // Gaps still waiting for the router when the page went away: their answers
    // went with it, so ask again, adjacent ones in one request as before.
    for (const [from, to] of restored.pendingRuns) {
      void resolveGaps(from, new Array<SnapMode>(to - from + 1).fill('snapped'));
    }
  }, [writePoints, writeSegments, resolveGaps]);

  useDraftSaving({ drawing, controlPoints, segments, target, area, borrow }, joinRef, isStandIn);

  // ------------------------------------------------------ layers and events

  useDrawLayers(map);
  useDrawEvents(
    map,
    drawing,
    useMemo(
      () => ({
        points: cpRef,
        segments: segRef,
        area: areaRef,
        picking: pickingRef,
        join: joinRef,
        borrow: borrowRef,
        follow: followRef,
        selected: selectedRef,
      }),
      [],
    ),
    {
      setPicking,
      addPoint,
      insertPoint,
      deletePoint,
      toggleSegment,
      resolveGaps,
      writePoints,
      writeSegments,
      markStandIn,
      isStandIn,
      select,
      setFollowOffer,
    },
  );

  // -------------------------------------------------------------- rendering

  const line = useMemo(() => joinSegments(segments), [segments]);

  /** Control points where the route turns back on itself. Shown, never changed. */
  const uTurns = useMemo(
    () => (area ? [] : findUTurns(segments, isStandIn)),
    [segments, area, isStandIn],
  );

  /** A stand-in is still on the line: not road geometry yet, so not ready to save. */
  const unresolved = useMemo(
    () => segments.some((s) => !!s && isStandIn(s)),
    [segments, isStandIn],
  );

  useDrawRendering(map, { segments, controlPoints, area, uTurns, picking, selected });

  return {
    drawing,
    controlPoints,
    segments,
    line,
    snapping: gaps.snapping,
    /** True while a stand-in is still on the line (gapResolver.ts). */
    unresolved,
    freehand,
    setFreehand,
    target,
    /** Non-null while tracing a hotspot; null while drawing a route. */
    area,
    /** Set once part of a saved direction has been taken over (Extend). */
    borrow,
    /** Set while choosing where a new route leaves a saved direction. */
    picking,
    startExtend,
    keep,
    joinGate,
    connect,
    lineNow,
    /** Control points where the route turns back on itself (see findUTurns). */
    uTurns,
    load,
    metres: useMemo(() => lineLength(line), [line]),
    start,
    startArea,
    loadArea,
    adoptHotspot,
    cancel,
    undo,
    addPoint,
    insertPoint,
    deletePoint,
    toggleSegment,
    /** The point a finger tapped, or null; its bar is PointBar.tsx. */
    selected,
    select,
    deleteSelected: pointBar.deleteSelected,
    /** Whether the last Delete can still be put back. */
    canPutBack: pointBar.canPutBack,
    putBack: pointBar.putBack,
    /** The lines a finger tap just added a point on, while that point is still the last. */
    followOffer: pointBar.followOffer,
    takeFollowOffer: pointBar.takeFollowOffer,
  };
}

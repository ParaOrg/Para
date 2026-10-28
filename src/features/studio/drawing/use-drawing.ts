import type { MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { DirectionDrawing } from '@/features/routes/model/routes';
import {
  joinSegments,
  lineLength,
  type LngLat,
  type Segment,
  type SnapMode,
} from '@/shared/utils/geo';

import { readDraft, restoredState, useDraftSaving } from './draft';
import { useDrawLayers } from './draw-layers';
import { addBeforeJoin, insertInGap, removeAt, ringSegments } from './drawing-edits';
import type { AreaTarget, Borrow, HotspotKind, Picking, Target } from './drawing-types';
import { useGapResolver } from './gap-resolver';
import { useDrawEvents } from './use-draw-events';
import { useDrawRendering } from './use-draw-rendering';
import { useLineBorrowing } from './use-line-borrowing';
import { usePointBar } from './use-point-bar';
import { findUTurns } from './uturns';

/**
 * The drawing tool: a route's control points and the road between them, or a
 * hotspot's outline, from the first click to the save. This file keeps the
 * state, the refs the map's handlers read, the edits as thin callers and the
 * modes, and wires the rest together. Its types are drawing-types.ts and the
 * array arithmetic behind the edits drawing-edits.ts; the finger's Delete,
 * Put back and follow offer are use-point-bar.ts, Extend's keep and the
 * right-click's join use-line-borrowing.ts; what it paints is the draw-*
 * layers (draw-layers.ts), fed by use-draw-rendering.ts; how the pointer
 * drives it is use-draw-events.ts, the router's answers gap-resolver.ts, and
 * the draft on this device draft.ts.
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
  /** The point a finger tapped, whose bar of actions is open (point-bar.tsx). */
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

  /**
   * Whether new points go in ahead of a kept borrowed end (Extend's keep of
   * the end): the drawing ends on another line, so it is never a loop. Every
   * change to the join comes with new points, so a render asking this sees it.
   */
  const hasJoin = useCallback(
    () => joinRef.current !== null && cpRef.current.includes(joinRef.current),
    [],
  );

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

  /**
   * Begin a new direction from points that are not the editor's clicks, such
   * as an upload's line: they become the control points, and the router is
   * asked for every gap, the stand-ins showing meanwhile.
   */
  const startWithPoints = useCallback(
    (points: LngLat[]) => {
      start();
      writePoints(points);
      if (points.length > 1)
        void resolveGaps(0, new Array<SnapMode>(points.length - 1).fill('snapped'));
    },
    [start, writePoints, resolveGaps],
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

  // Extend's keep of one side of the picked spot, and a right-click's join.
  const { keep, joinGate, connect } = useLineBorrowing(
    useMemo(
      () => ({
        points: cpRef,
        segments: segRef,
        area: areaRef,
        picking: pickingRef,
        join: joinRef,
        borrow: borrowRef,
        connected: connectedRef,
        freehand: freehandRef,
      }),
      [],
    ),
    { writePoints, writeSegments, resolveGaps, setBorrow, setPicking },
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
   * rather than inserting the box a second time.
   */
  const adoptHotspot = useCallback((hotspotId: string) => {
    const a = areaRef.current;
    if (!a || a.hotspotId === hotspotId) return;
    const next = { ...a, hotspotId };
    setArea(next);
    areaRef.current = next;
  }, []);

  /** Open an outline for editing: a saved hotspot's, or (no id) a new one's first corners. */
  const loadArea = useCallback(
    (kind: HotspotKind, hotspotId: string | null, ring: LngLat[]) => {
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
    // went with it, so ask again, adjacent ones in one request.
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
    /** True while a stand-in is still on the line (gap-resolver.ts). */
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
    hasJoin,
    /** Control points where the route turns back on itself (see findUTurns). */
    uTurns,
    load,
    metres: useMemo(() => lineLength(line), [line]),
    start,
    startWithPoints,
    startArea,
    loadArea,
    adoptHotspot,
    cancel,
    undo,
    addPoint,
    insertPoint,
    deletePoint,
    toggleSegment,
    /** The point a finger tapped, or null; its bar is point-bar.tsx. */
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

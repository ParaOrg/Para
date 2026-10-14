import { useCallback, useEffect, useState, type RefObject } from 'react';

import type { LngLat, Segment, SnapMode } from '@/shared/utils/geo';

import { waitingRuns } from './drawing-edits';
import type { FollowOffer } from './drawing-types';

/** What the point bar's Delete keeps, to put back. */
interface Undone {
  points: LngLat[];
  segments: Segment[];
  join: LngLat | null;
  connected: { spot: LngLat; end: LngLat } | null;
}

/** How long Put back is offered after the point bar's Delete. */
const PUT_BACK_MS = 6000;

/**
 * The finger's half of the drawing's edits: the point bar's Delete, the Put
 * back it offers for a while after, and the offer to follow a saved line a
 * tap just added a point on (point-bar.tsx shows them; the pointer's tap and
 * long-press open the bar, use-draw-events.ts). The drawing's refs and
 * mutators are passed in, not owned, as useGapResolver's are: the point bar
 * reads the drawing between renders through them and writes through the
 * same mutators the map's handlers use. Which point is selected stays the
 * hook's (`select` clears on every point count change, in writePoints).
 */
export function usePointBar(
  refs: {
    points: RefObject<LngLat[]>;
    segments: RefObject<Segment[]>;
    join: RefObject<LngLat | null>;
    connected: RefObject<{ spot: LngLat; end: LngLat } | null>;
    selected: RefObject<number | null>;
    follow: RefObject<((directionIds: string[], at: LngLat, offered?: LngLat) => void) | undefined>;
  },
  actions: {
    deletePoint: (idx: number) => Promise<void>;
    writePoints: (pts: LngLat[]) => void;
    writeSegments: (next: Segment[]) => void;
    resolveGaps: (first: number, modes: SnapMode[]) => Promise<void>;
    isStandIn: (s: Segment) => boolean;
  },
  controlPoints: LngLat[],
) {
  const {
    points: cpRef,
    segments: segRef,
    join: joinRef,
    connected: connectedRef,
    selected: selectedRef,
    follow: followRef,
  } = refs;
  const { deletePoint, writePoints, writeSegments, resolveGaps, isStandIn } = actions;

  /**
   * The drawing as it was before the point bar's Delete, and as Delete left
   * it: Put back restores `before` while the drawing is still `after`.
   */
  const [deleted, setDeleted] = useState<{ before: Undone; after: LngLat[] } | null>(null);
  /**
   * A finger tap that added a point on a saved line offers to follow that
   * line instead: the lines under it, where, and the point the tap added.
   */
  const [followOffer, setFollowOffer] = useState<FollowOffer | null>(null);

  /** The point bar's Delete: the selected point goes, and can be put back for a while. */
  const deleteSelected = useCallback(() => {
    const i = selectedRef.current;
    if (i === null) return;
    const before = {
      points: cpRef.current,
      segments: segRef.current,
      join: joinRef.current,
      connected: connectedRef.current,
    };
    void deletePoint(i);
    setDeleted({ before, after: cpRef.current });
  }, [cpRef, segRef, joinRef, connectedRef, selectedRef, deletePoint]);

  const putBack = useCallback(() => {
    if (!deleted || cpRef.current !== deleted.after) return;
    const { points, segments, join, connected } = deleted.before;
    writePoints(points);
    writeSegments(segments);
    joinRef.current = join;
    connectedRef.current = connected;
    setDeleted(null);
    // A stretch still waiting for the router lost its request to the Delete:
    // ask again, each run of them in one request.
    for (const [from, to] of waitingRuns(segments, isStandIn)) {
      void resolveGaps(
        from,
        segments.slice(from, to + 1).map((g) => g.snap),
      );
    }
  }, [deleted, cpRef, joinRef, connectedRef, writePoints, writeSegments, isStandIn, resolveGaps]);

  // Put back is offered for a few seconds after the Delete.
  useEffect(() => {
    if (!deleted) return;
    const t = setTimeout(() => setDeleted(null), PUT_BACK_MS);
    return () => clearTimeout(t);
  }, [deleted]);

  /**
   * Take the follow offer: the line is followed from where the tap was, and
   * the point the tap added goes only once the join goes ahead (`connect`),
   * so a refused follow leaves the drawing as it was.
   */
  const takeFollowOffer = useCallback(() => {
    const o = followOffer;
    setFollowOffer(null);
    if (!o || cpRef.current[cpRef.current.length - 1] !== o.point) return;
    followRef.current?.(o.ids, o.at, o.point);
  }, [followOffer, cpRef, followRef]);

  /** What reset does to the bar: no Delete to put back, no offer to take. */
  const clear = useCallback(() => {
    setDeleted(null);
    setFollowOffer(null);
  }, []);

  return {
    deleteSelected,
    putBack,
    /** Whether the last Delete can still be put back. */
    canPutBack: deleted !== null && controlPoints === deleted.after,
    /** The lines a finger tap just added a point on, while that point is still the last. */
    followOffer:
      followOffer && controlPoints[controlPoints.length - 1] === followOffer.point
        ? followOffer
        : null,
    /** The setter itself, so the events' actions keep one identity. */
    setFollowOffer,
    takeFollowOffer,
    clear,
  };
}

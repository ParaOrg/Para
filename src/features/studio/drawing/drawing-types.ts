import type { BorrowPart } from '@/features/routes/model/direction-schema';
import type { DirectionDrawing } from '@/features/routes/model/routes';
import type { LngLat } from '@/shared/utils/geo';

import type { LineSpot } from './borrow';

/**
 * The drawing's shared types: what a save writes to, which hotspot an outline
 * becomes, and the three states a route drawing passes through while it
 * borrows from a saved line. A leaf on purpose, with no React and no hook, so
 * any module of the drawing can import these without a cycle through
 * useDrawing. `Drawing`, the hook's return type, stays in use-drawing.ts.
 */

/** What a save will write to: an existing direction, a new direction on an existing route, or (both null) a new route. */
export interface Target {
  routeId: string | null;
  directionId: string | null;
}

/** Which kind of hotspot an area trace will become. */
export type HotspotKind = 'terminal' | 'hintuan';

/**
 * Set while tracing a hotspot instead of a route. The same click / drag /
 * insert / delete / undo machinery runs; the differences are that every edge
 * is a straight line (no router), the ring closes itself, and a fill is drawn.
 * `hotspotId` is the saved hotspot being edited, or null for a new one.
 */
export interface AreaTarget {
  kind: HotspotKind;
  hotspotId: string | null;
}

/**
 * Set once a drawing has taken over part of a saved direction (Extend): which
 * one, and which part. What the save records, so a later change to the parent
 * can offer to follow into this line.
 */
export interface Borrow {
  directionId: string;
  part: BorrowPart;
}

/**
 * Set while choosing where a new route leaves a saved direction, before any
 * of it is taken: the direction, and the spot tapped on it so far.
 */
export interface Picking {
  direction: DirectionDrawing;
  spot: LineSpot | null;
}

/** See `followOffer` in useDrawing. */
export interface FollowOffer {
  ids: string[];
  at: LngLat;
  point: LngLat;
}

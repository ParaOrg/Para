import type { BorrowPart } from '@/features/routes/model/direction-schema';
import type { TransportMode } from '@/features/routes/model/routes';
import type { LngLat, Segment } from '@/shared/utils/geo';

/**
 * What the save panel collects. Route fields — the ends, the via, the
 * signboard, the mode, the fare note — belong to the route and are shared by
 * both its directions. With routeId set they are written only when
 * `writeRoute` says so: Edit route changes them, so a route's ends can be
 * corrected without a delete; drawing a route's return trip leaves them.
 */
export interface SaveInput {
  routeId: string | null;
  directionId: string | null;
  /** With routeId: write the route's facts too (Edit route). */
  writeRoute?: boolean;
  /** Optional since 0006: an observed fact, filled in when the owner is sure. */
  signboard: string;
  mode: TransportMode;
  fareNote: string;
  /** The two ends, as hotspots. The name is generated from them. Null on a loop, which has neither. */
  headHotspotId: string | null;
  tailHotspotId: string | null;
  /** A loop: goes round one way, no ends, one direction, called by its signboard (0021). Set when the route is made. */
  isLoop: boolean;
  /** Only when another route shares both ends by a different road. */
  via: string;
  /** false = head to tail; true = the way back. */
  reversed: boolean;
  controlPoints: LngLat[];
  segments: Segment[];
  /**
   * What this line borrowed, when it was started with Extend (0008). Null
   * when it borrows nothing, including a borrowed part since redrawn away.
   */
  borrowedFrom: string | null;
  borrowedPart: BorrowPart | null;
  borrowedMetres: number | null;
}

/**
 * An ikot's signboard and via as route_loop_unique folds them: case and the
 * spaces at either end do not tell two apart, and no via is the empty one.
 */
export function foldLoopKey(signboard: string | null, via: string | null): string {
  const fold = (text: string | null) => (text ?? '').trim().toLowerCase();
  return `${fold(signboard)}\u0000${fold(via)}`;
}

/** The one sentence for route_ends_unique refusing an edit. */
export const ENDS_TAKEN =
  'Another route already runs between these two places. Give one of them a via to tell them apart, or pick other ends.';

/** The one sentence for route_loop_unique refusing a loop. */
export const LOOP_TAKEN =
  'Another ikot already has this signboard. Give one of them a via to tell them apart.';

export const DRAWN_ALREADY =
  'A route between these two places already has this direction drawn. To change it, open it and press Edit route.';

import { FLICK, shownAt, snapFor, type SheetHeights, type Snap } from './sheet-gesture';

/**
 * How far a let-go sheet coasts, as time at the finger's speed: a finger leaving it at 1 px/ms
 * coasts 250 px, at 2 px/ms 500 px. Linear in the speed, as a phone's own list is, so a flick
 * twice as fast goes twice as far, and every free coast takes the same time (FREE_GLIDE_MS).
 */
export const COAST_REACH_MS = 250;

/** How long a coast that stops on its own takes: its ease's start is three times its average. */
export const FREE_GLIDE_MS = 3 * COAST_REACH_MS;

/**
 * Below this speed, in px/ms, a release is a placement, not a throw: no coast, and the sheet
 * settles in its usual glide.
 */
const MIN_THROW = 0.1;

/**
 * A coast's curve, x(t) = 1 − (1 − t)³ exactly: it leaves at three times its average speed (the
 * finger's) and slows to rest with no bounce, quick to start and gentle to stop.
 */
export const COAST_EASE = 'cubic-bezier(0.3333, 1, 0.6667, 1)';

/** How far a sheet let go at `velocity` (px/ms, upwards positive) coasts before it stops. */
export function coast(velocity: number): number {
  return Math.abs(velocity) < MIN_THROW ? 0 : velocity * COAST_REACH_MS;
}

/** A glide on its own curve: how long it takes, and the CSS timing function it follows. */
export interface Glide {
  ms: number;
  ease: string;
}

/** The list's own coast at full, carried on from the sheet's: px down the list, and how long. */
export interface ListCoast {
  /** When it starts, in ms after the release: as the sheet arrives at full. */
  afterMs: number;
  px: number;
  ms: number;
}

/** Where a let-go sheet rests, its glide there (null: the usual glide), and the list's coast after. */
export interface Landing {
  to: Snap | 'close';
  glide: Glide | null;
  list: ListCoast | null;
}

/**
 * The list's coast at `velocity` (px/ms, upwards positive: down the list), from `scrolled` px down
 * it with `room` px more below: as far as COAST_REACH_MS takes it, a soft stop at either end.
 */
export function listCoast(
  velocity: number,
  scrolled: number,
  room: number,
): Omit<ListCoast, 'afterMs'> | null {
  const px = Math.max(-scrolled, Math.min(room, coast(velocity)));
  if (Math.abs(px) < 1) return null;
  return { px, ms: (3 * Math.abs(px)) / Math.abs(velocity) };
}

/**
 * The first `share` (0–1) of COAST_EASE's time, as a curve of its own: the coast cut short where
 * the sheet reaches full and the list takes over, still moving.
 */
function easeUntil(share: number): string {
  const end = 1 - (1 - share) ** 3;
  const y1 = share / end;
  const y2 = (2 * share - share * share) / end;
  return `cubic-bezier(0.3333, ${y1.toFixed(4)}, 0.6667, ${y2.toFixed(4)})`;
}

/**
 * Where a sheet let go rests, with its momentum: it coasts on from where the finger lifted
 * (`shown`, px on screen) at the finger's speed, slowing on COAST_EASE, and rests where it stops,
 * clamped between Low and full, where it stops softly with no bounce. Thrown up past full with
 * `listRoom` px of list below, it arrives at full still moving and the list carries the rest of
 * the coast. Low's magnet catches it where it stops. A fast flick down begun at Low closes it
 * (`from`, px on screen as the drag began), and a sheet let go below half of Low still closes, as
 * snapFor rules. Under reduced motion there is no coast: it snaps as snapFor rules.
 */
export function glideTo(
  shown: number,
  velocity: number,
  heights: SheetHeights,
  h: number,
  isReducedMotion = false,
  from = shown,
  listRoom = 0,
): Landing {
  const isClosing = velocity <= -FLICK && from <= heights.low + 1;
  if (isReducedMotion || isClosing || shown < heights.low / 2) {
    // No coast, and no speed but a closing flick's: reduced motion rests where the finger lifts.
    const speed = isClosing || shown < heights.low / 2 ? velocity : 0;
    return { to: snapFor(shown, speed, heights, h, from), glide: null, list: null };
  }
  const reach = coast(velocity);
  const to = snapFor(Math.max(heights.low, Math.min(heights.full, shown + reach)), 0, heights, h);
  const travel = (to === 'close' ? 0 : shownAt(to, h, heights)) - shown;
  const speed = Math.abs(velocity);
  // Past full with list to scroll: the coast's own curve, cut where the sheet arrives at full.
  if (to === 'full' && reach > travel && listRoom >= 1) {
    const share = 1 - (1 - Math.max(0, travel) / reach) ** (1 / 3);
    const afterMs = share * FREE_GLIDE_MS;
    // The rest of the same curve, for the list: leaving at the speed the sheet arrived at.
    const arriving = velocity * (1 - share) ** 2;
    const px = Math.min(reach - Math.max(0, travel), listRoom);
    const glide = travel >= 1 ? { ms: afterMs, ease: easeUntil(share) } : null;
    const list = { afterMs: glide ? afterMs : 0, px, ms: (3 * px) / arriving };
    return { to, glide, list: px >= 1 ? list : null };
  }
  // The glide starts at the finger's speed only where it goes the finger's way, and a placement
  // (below MIN_THROW) has no speed to start at.
  if (reach === 0 || Math.abs(travel) < 1 || Math.sign(travel) !== Math.sign(velocity)) {
    return { to, glide: null, list: null };
  }
  // Pulled on past its coast by Low's magnet, a slow throw still arrives in a free coast's time.
  const ms = Math.min(FREE_GLIDE_MS, (3 * Math.abs(travel)) / speed);
  return { to, glide: { ms, ease: COAST_EASE }, list: null };
}

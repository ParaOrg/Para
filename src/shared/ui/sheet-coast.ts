import { FLICK, shownAt, snapFor, type SheetHeights, type Snap } from './sheet-gesture';

/**
 * How fast a let-go sheet slows, in px/ms²: a finger leaving it at 1 px/ms (a brisk drag) coasts
 * 200 px over 400 ms, at 2 px/ms (a flick) 800 px over 800 ms, as far as the sheet goes. Twice the
 * glide it had at 0.005, the owner's pick (2026-11-22): at that, a flick barely carried on.
 */
export const SHEET_DECEL = 0.0025;

/**
 * Below this speed, in px/ms, a release is a placement, not a throw: no coast, and the sheet
 * settles in its usual glide.
 */
const MIN_THROW = 0.1;

/**
 * The longest a glide takes, in ms, however short the throw: a slow one still arrives. Twice what
 * it was with the glide, so the doubled glide of a hard flick (v/a, 800 ms at 2 px/ms) is not cut.
 */
export const MAX_GLIDE_MS = 1400;

/**
 * Even deceleration as CSS draws it: x(t) = 2t − t², which starts at twice the average speed (the
 * finger's) and ends at rest, with no bounce.
 */
export const GLIDE_EASE = 'cubic-bezier(0.333, 0.667, 0.667, 1)';

/** How far a sheet let go at `velocity` (px/ms, upwards positive) coasts before it stops: v²/2a. */
export function coast(velocity: number): number {
  if (Math.abs(velocity) < MIN_THROW) return 0;
  return (Math.sign(velocity) * velocity * velocity) / (2 * SHEET_DECEL);
}

/** Where a let-go sheet rests, and how long its glide there takes (null: the usual glide). */
export interface Landing {
  to: Snap | 'close';
  glideMs: number | null;
}

/**
 * Where a sheet let go rests, with its momentum: it coasts on from where the finger lifted
 * (`shown`, px on screen) at the finger's speed, slowing evenly, and rests where it stops, clamped
 * between Low and full, the soft stop at either with no bounce. A fast flick down still takes it
 * to Low, or closes it from Low, and a sheet let go below half of Low still closes (snapFor);
 * Low's magnet catches it where it stops. Under reduced motion there is no coast: it snaps as
 * snapFor rules.
 */
export function glideTo(
  shown: number,
  velocity: number,
  heights: SheetHeights,
  h: number,
  isReducedMotion = false,
): Landing {
  if (isReducedMotion || velocity <= -FLICK || shown < heights.low / 2) {
    return { to: snapFor(shown, velocity, heights, h), glideMs: null };
  }
  const rest = Math.max(heights.low, Math.min(heights.full, shown + coast(velocity)));
  const to = snapFor(rest, 0, heights, h);
  const travel = (to === 'close' ? 0 : shownAt(to, h, heights)) - shown;
  // The glide starts at the finger's speed only where it goes the finger's way, and a placement
  // (below MIN_THROW) has no speed to start at.
  const isPlacement = Math.abs(velocity) < MIN_THROW;
  if (isPlacement || Math.abs(travel) < 1 || Math.sign(travel) !== Math.sign(velocity)) {
    return { to, glideMs: null };
  }
  return { to, glideMs: Math.min(MAX_GLIDE_MS, (2 * Math.abs(travel)) / Math.abs(velocity)) };
}

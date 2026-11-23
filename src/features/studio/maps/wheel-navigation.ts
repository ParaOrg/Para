/*
 * The studio map's wheel, as Figma's canvas reads it: with no key, it pans
 * up and down; with Shift, left and right; a trackpad's sideways scroll pans
 * sideways. Ctrl/⌘ held (and a trackpad's pinch, which arrives as a wheel
 * with Ctrl held) zooms, and that is MapLibre's own eased scroll zoom, so it
 * is not read here. A pan glides: each wheel adds to what is still to go,
 * and every frame covers a share of it (panStep), so a mouse's notch eases
 * in and a trackpad's stream of small deltas flows on without steps.
 * Pure, so tests/unit/wheel-navigation-test.mjs can hold it.
 */

/** The parts of a wheel event the studio reads. */
export interface WheelInput {
  deltaX: number;
  deltaY: number;
  /** 0 pixels, 1 lines, 2 pages: WheelEvent.deltaMode. */
  deltaMode: number;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

/** Pixels on the screen, across and down. */
export interface PanPixels {
  x: number;
  y: number;
}

/** A line of scroll, in pixels, as browsers count one. */
const LINE_PX = 16;

/** The share of what is still to go that one frame pans: about a fifth of a second to settle. */
const SHARE_PER_FRAME = 0.3;

/** Less than this left, in pixels, and the glide ends where it was going. */
const SETTLED_PX = 0.5;

/** Whether a wheel is a zoom, Ctrl/⌘ held or a pinch: MapLibre's, not the studio's. */
export function isZoomWheel(input: WheelInput): boolean {
  return input.ctrlKey || input.metaKey;
}

/** How far a wheel pans the map, in pixels; `pagePx` is the map's height, a page of scroll. */
export function wheelPan(input: WheelInput, pagePx: number): PanPixels {
  const unit = input.deltaMode === 1 ? LINE_PX : input.deltaMode === 2 ? pagePx : 1;
  const x = input.deltaX * unit;
  const y = input.deltaY * unit;
  // Shift turns a mouse's up-and-down wheel sideways; some browsers already have.
  if (input.shiftKey) return { x: x !== 0 ? x : y, y: 0 };
  return { x, y };
}

/** One frame of a glide: how far to pan now, and what is left after it. */
export function panStep(remaining: PanPixels): { step: PanPixels; rest: PanPixels } {
  if (Math.hypot(remaining.x, remaining.y) < SETTLED_PX) {
    return { step: remaining, rest: { x: 0, y: 0 } };
  }
  const step = { x: remaining.x * SHARE_PER_FRAME, y: remaining.y * SHARE_PER_FRAME };
  return { step, rest: { x: remaining.x - step.x, y: remaining.y - step.y } };
}

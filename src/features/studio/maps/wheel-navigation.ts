/*
 * The studio map's wheel, as Figma's canvas reads it: Ctrl/⌘ held, the
 * wheel zooms about the pointer (a trackpad's pinch arrives as a wheel with
 * Ctrl held, and zooms the same way); with no key, it pans up and down;
 * with Shift, left and right. A trackpad's sideways scroll pans sideways.
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

/** What a wheel does to the map: zoom by levels about the pointer, or pan by pixels. */
export type WheelMove = { kind: 'zoom'; by: number } | { kind: 'pan'; x: number; y: number };

/** A line of scroll, in pixels, as browsers count one. */
const LINE_PX = 16;

/** Pixels of wheel for one zoom level: a mouse's notch (100 px) is half a level, a pinch's small steps glide. */
const PX_PER_LEVEL = 200;

/** The most one wheel event zooms, so a fast spin never leaps across the city. */
const MAX_LEVELS = 1;

/** The wheel's deltas in pixels, whatever unit the browser gave them in. */
function inPixels(input: WheelInput, pagePx: number): { x: number; y: number } {
  const unit = input.deltaMode === 1 ? LINE_PX : input.deltaMode === 2 ? pagePx : 1;
  return { x: input.deltaX * unit, y: input.deltaY * unit };
}

/** What `input` does to the map; `pagePx` is the map's height, a page of scroll. */
export function wheelMove(input: WheelInput, pagePx: number): WheelMove {
  const { x, y } = inPixels(input, pagePx);
  if (input.ctrlKey || input.metaKey) {
    const by = Math.max(-MAX_LEVELS, Math.min(MAX_LEVELS, -y / PX_PER_LEVEL));
    return { kind: 'zoom', by };
  }
  // Shift turns a mouse's up-and-down wheel sideways; some browsers already have.
  if (input.shiftKey) return { kind: 'pan', x: x !== 0 ? x : y, y: 0 };
  return { kind: 'pan', x, y };
}

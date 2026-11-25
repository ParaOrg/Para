import { FLICK, type SheetHeights } from './sheet-gesture';

/**
 * Where a sheet with two rests lets go (the explore cards, the owner's rule of 2026-11-25): Low or
 * full, never between. A flick (FLICK) goes its own way; slower, it goes to the nearer of the two.
 * `shown` and `velocity` (upwards, px/ms) as snapFor reads them.
 */
export function twoRestFor(shown: number, velocity: number, heights: SheetHeights): 'low' | 'full' {
  if (velocity >= FLICK) return 'full';
  if (velocity <= -FLICK) return 'low';
  return shown - heights.low < heights.full - shown ? 'low' : 'full';
}

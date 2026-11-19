import { useEffect, useRef, type RefObject } from 'react';

import { GLIDE_EASE } from './sheet-coast';

/** Whether the person asks for less motion: then a let-go sheet does not coast (glideTo). */
export function isReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * How much of the sheet shows on screen right now, mid-glide too: its height less how far it has
 * slid down from where it is laid out. A finger catching a gliding sheet takes it from here, not
 * from where the glide was going.
 */
export function shownOnScreen(sheet: HTMLElement): number {
  const laidOutTop = (sheet.offsetParent?.getBoundingClientRect().top ?? 0) + sheet.offsetTop;
  return sheet.offsetHeight - (sheet.getBoundingClientRect().top - laidOutTop);
}

/**
 * A thrown sheet's one glide: `glide(ms)` sets the sheet's and its followers' glide to `ms` on the
 * even-deceleration curve (GLIDE_EASE), so the sheet leaves at the finger's speed and the ⓘ, the
 * locator and the Overview button keep up with it; once it has arrived they go back to the
 * token's glide. `glide(null)` puts them back at once, for a tap's or a key's step.
 */
export function useSheetGlide(sheet: RefObject<HTMLDivElement | null>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What the last glide was set on: the followers outlive the sheet, so an unmount clears them too.
  const glided = useRef<HTMLElement[]>([]);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    for (const el of glided.current) {
      el.style.removeProperty('transition-duration');
      el.style.removeProperty('transition-timing-function');
    }
    glided.current = [];
  };
  const clearRef = useRef(clear);
  useEffect(() => () => clearRef.current(), []);
  return (ms: number | null) => {
    clear();
    const el = sheet.current;
    if (ms === null || !el) return;
    const host = el.closest<HTMLElement>('[data-dock-host]');
    glided.current = [el, ...(host?.querySelectorAll<HTMLElement>('[data-dock-follower]') ?? [])];
    // On each element itself, not the token variables: those would pass down to what it holds.
    for (const target of glided.current) {
      target.style.transitionDuration = `${Math.round(ms)}ms`;
      target.style.transitionTimingFunction = GLIDE_EASE;
    }
    timer.current = setTimeout(clear, ms + 50);
  };
}

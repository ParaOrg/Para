import { useEffect, useRef, type RefObject } from 'react';

import { SHEET_GLIDE, motionOf } from '@/shared/utils/motion';

import type { Glide } from './sheet-coast';

/** Whether the person asks for less motion: then a let-go sheet does not coast (glideTo). */
export function isReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * How much of the sheet shows on screen right now, mid-glide too, in the px slideShowing takes:
 * its height less how far it has slid down from where it is laid out, less the strip it stands
 * clear of a phone's home indicator (its bottom padding), and `full` at full height. A finger catching a gliding sheet takes
 * it from here, not from where the glide was going.
 */
export function shownOnScreen(sheet: HTMLElement, full: number): number {
  const laidOutTop = (sheet.offsetParent?.getBoundingClientRect().top ?? 0) + sheet.offsetTop;
  const onScreen = sheet.offsetHeight - (sheet.getBoundingClientRect().top - laidOutTop);
  // At full it is lifted by nothing: its top stands at the strip of map (slide's `full`).
  if (onScreen >= full - 1) return full;
  return onScreen - (parseFloat(getComputedStyle(sheet).paddingBottom) || 0);
}

/**
 * A let-go sheet's one glide, on the sheet and its followers (the ⓘ, the locator, the Overview
 * button), set on each element itself so it holds from the moment the finger lifts, while the
 * page still marks the sheet held: `glide(coast)` on the coast's own curve (glideTo), so the sheet
 * leaves at the finger's speed; `glide(null)` the token's. Once it has arrived they go back to
 * their own. `clear()` takes it off at once, for a sheet caught by a finger; `isCoasting()` says
 * whether a throw's coast is still under way, which a finger stops as it stops a list's fling (a
 * tap's or a key's glide it does not). Under reduced motion nothing is set: the sheet does not
 * glide.
 */
export function useSheetGlide(sheet: RefObject<HTMLDivElement | null>) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // What the last glide was set on: the followers outlive the sheet, so an unmount clears them too.
  const glided = useRef<HTMLElement[]>([]);
  const isCoast = useRef(false);
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    for (const el of glided.current) {
      for (const name of [
        'transition-property',
        'transition-duration',
        'transition-timing-function',
      ])
        el.style.removeProperty(name);
    }
    glided.current = [];
    isCoast.current = false;
  };
  const clearRef = useRef(clear);
  useEffect(() => () => clearRef.current(), []);
  const glide = (coast: Glide | null) => {
    clear();
    isCoast.current = coast !== null;
    const el = sheet.current;
    if (!el || isReducedMotion()) return;
    const host = el.closest<HTMLElement>('[data-dock-host]');
    glided.current = [el, ...(host?.querySelectorAll<HTMLElement>('[data-dock-follower]') ?? [])];
    // On each element itself, not the token variables: those would pass down to what it holds.
    for (const target of glided.current) {
      target.style.transitionProperty = 'translate';
      target.style.transitionDuration = coast
        ? `${Math.round(coast.ms)}ms`
        : `var(${SHEET_GLIDE[0]})`;
      target.style.transitionTimingFunction = coast ? coast.ease : `var(${SHEET_GLIDE[1]})`;
    }
    timer.current = setTimeout(clear, (coast?.ms ?? motionOf(SHEET_GLIDE).duration) + 100);
  };
  // A coast this set, still moving: the clean-up after it, a tap's glide and any other motion are not.
  const isCoasting = () =>
    isCoast.current &&
    glided.current.length > 0 &&
    !!sheet.current
      ?.getAnimations()
      .some((a) => a instanceof CSSTransition && a.transitionProperty === 'translate');
  return { glide, clear, isCoasting };
}

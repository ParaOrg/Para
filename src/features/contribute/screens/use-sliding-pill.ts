import { useLayoutEffect, useRef } from 'react';

import { isMoveInRun, motionOf, prefersReducedMotion } from '../common/tab-motion';

/**
 * Where the last toolbar drawn had its pill, and which tab that was. Each screen draws a toolbar of
 * its own, so the one a tap leads to starts its pill where the last one ended it.
 */
let last: { tab: string; left: number } | null = null;

/**
 * Where a slid pill was let go (use-toolbar-slide.ts): the next screen's toolbar starts it there,
 * already under its tab, rather than sliding it again from the screen before.
 */
export function notePillAt(tab: string, left: number): void {
  last = { tab, left };
}

/**
 * Puts the pill under the tab named `to` and, when it was last under another, glides it there
 * from where it is seen now: still gliding (a tap of a run, before the last move ended) or left
 * where a quick swipe let it go, never from where it was headed. The two tabs' icons and words
 * cross-fade their colour in the same time. `isQuick` is a tap of a run, which the pill keeps up
 * with.
 */
function glidePill(bar: HTMLElement, pill: HTMLElement, to: string, isQuick: boolean): void {
  const tabOf = (name: string) => bar.querySelector<HTMLElement>(`[data-tab="${name}"]`);
  const tab = tabOf(to);
  if (!tab) return;
  // Read before the glide under way is let go. A pill not yet placed has no place to start from.
  const glides = pill.getAnimations();
  const shownAt =
    pill.style.transform === ''
      ? null
      : pill.getBoundingClientRect().left - bar.getBoundingClientRect().left;
  pill.style.width = `${tab.offsetWidth}px`;
  pill.style.transform = `translateX(${tab.offsetLeft}px)`;
  const from = last;
  last = { tab: to, left: tab.offsetLeft };
  // Already here (a slide let go on this tab, still settling): its glide carries on.
  if (!from || from.tab === to) return;
  // The last move's glide and its tabs' colour fades give way to this one.
  for (const glide of glides) glide.cancel();
  for (const each of bar.querySelectorAll('[data-tab]')) {
    for (const fade of each.getAnimations()) fade.cancel();
  }
  if (prefersReducedMotion()) return;
  // The owner's Motion for the toolbar's pill (tokens.css), a soft spring.
  const slide = motionOf(isQuick ? 'pillQuick' : 'pill');
  pill.animate(
    [
      { transform: `translateX(${shownAt ?? from.left}px)` },
      { transform: `translateX(${tab.offsetLeft}px)` },
    ],
    slide,
  );
  const before = tabOf(from.tab);
  if (!before) return;
  // Each tab's colour now is the other's colour then: the new one darkens, the old one greys.
  const marked = getComputedStyle(tab).color;
  const unmarked = getComputedStyle(before).color;
  // In the pill's time, without its spring: a colour has nothing to overshoot to.
  const fade = { duration: slide.duration, easing: motionOf('move').easing };
  tab.animate([{ color: unmarked }, { color: marked }], fade);
  before.animate([{ color: marked }, { color: unmarked }], fade);
}

/**
 * The toolbar's pill (the mark under the screen showing), put under the tab named `current` and,
 * when the last toolbar had it under another, slid there from it. Transform and colour only;
 * nothing for less motion.
 */
export function useSlidingPill(current: string) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const pill = pillRef.current;
    if (!bar || !pill) return;
    glidePill(bar, pill, current, isMoveInRun());
  }, [current]);

  return { barRef, pillRef };
}

import { useLayoutEffect, useRef } from 'react';

import { prefersReducedMotion } from '../common/tab-motion';

/** The pill's slide, as the owner's brief has it: quick, but seen. */
const SLIDE = { duration: 250, easing: 'cubic-bezier(0.2, 0, 0, 1)' } as const;

/**
 * Where the last toolbar drawn had its pill, and which tab that was. Each screen draws a toolbar of
 * its own, so the one a tap leads to starts its pill where the last one ended it.
 */
let last: { tab: string; left: number } | null = null;

/**
 * The toolbar's pill (the mark under the screen showing), put under the tab named `current` and,
 * when the last toolbar had it under another, slid there from it. The two tabs' icons and words
 * cross-fade their colour in the same time. Transform and colour only; nothing for less motion.
 */
export function useSlidingPill(current: string) {
  const barRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const bar = barRef.current;
    const pill = pillRef.current;
    const tabOf = (name: string) => bar?.querySelector<HTMLElement>(`[data-tab="${name}"]`);
    const tab = tabOf(current);
    if (!bar || !pill || !tab) return;
    pill.style.width = `${tab.offsetWidth}px`;
    pill.style.transform = `translateX(${tab.offsetLeft}px)`;
    const from = last;
    last = { tab: current, left: tab.offsetLeft };
    if (!from || from.tab === current || prefersReducedMotion()) return;
    pill.animate(
      [
        { transform: `translateX(${from.left}px)` },
        { transform: `translateX(${tab.offsetLeft}px)` },
      ],
      SLIDE,
    );
    const before = tabOf(from.tab);
    if (!before) return;
    // Each tab's colour now is the other's colour then: the new one darkens, the old one greys.
    const marked = getComputedStyle(tab).color;
    const unmarked = getComputedStyle(before).color;
    tab.animate([{ color: unmarked }, { color: marked }], SLIDE);
    before.animate([{ color: marked }, { color: unmarked }], SLIDE);
  }, [current]);

  return { barRef, pillRef };
}

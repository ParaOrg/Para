import { useLayoutEffect, useRef } from 'react';

import { screenEntryDirection } from './tab-motion';

/**
 * A toolbar screen's own way in, from the side the tabs run from, 28 px and a fade, 220 ms: where
 * the browser has no view transitions, and where the screen's code arrived after one had begun.
 * The screen it left is gone at once. Nothing for less motion (tab-motion.ts).
 */
export function useScreenEntry<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const direction = screenEntryDirection();
    if (!ref.current || !direction) return;
    const from = direction === 'forward' ? 28 : -28;
    ref.current.animate(
      [
        { opacity: 0, transform: `translateX(${from}px)` },
        { opacity: 1, transform: 'none' },
      ],
      { duration: 220, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    );
  }, []);
  return ref;
}

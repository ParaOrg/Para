import { useLayoutEffect, useRef } from 'react';

import { motionOf, screenEntryDirection, tabShift } from './tab-motion';

/**
 * A toolbar screen's own way in, from the side the tabs run from, a short way and a fade: where
 * the browser has no view transitions, and where the screen's code arrived after one had begun.
 * The screen it left is gone at once. Nothing for less motion (tab-motion.ts).
 */
export function useScreenEntry<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const direction = screenEntryDirection();
    if (!ref.current || !direction) return;
    ref.current.animate(
      [
        { opacity: 0, transform: tabShift(direction === 'forward' ? 1 : -1) },
        { opacity: 1, transform: 'none' },
      ],
      motionOf('arrive'),
    );
  }, []);
  return ref;
}

import { useCallback, useRef } from 'react';

import { retryingImport } from '@/shared/utils/retrying-import';

import type { morphStartIntoCard } from './start-morph';
import { START_BUTTON_ATTR } from './start-morph-attrs';

// Start tracking's morph, off the opening: fetched with the recording screens ahead of Start.
const loadStartMorph = retryingImport(() => import('./start-morph'));

export interface StartMorph {
  /** Fetches the morph's code ahead of Start. Rejects as the fetch does. */
  fetchAhead: () => Promise<void>;
  /** Runs `start`, then morphs Start tracking into the recording card if the morph is here. */
  startWithMorph: (start: () => void) => void;
}

/** Start tracking's morph into the recording card, fetched ahead and run in the tap. */
export function useStartMorph(): StartMorph {
  // The morph once its code is here. It runs in the tap, before the button leaves the screen, so a
  // tap before then (or with its fetch failed) just starts, with no morph.
  const morphStartRef = useRef<typeof morphStartIntoCard | null>(null);
  // Stable, as the page's fetch-ahead effect lists it as a dependency.
  const fetchAhead = useCallback(
    () =>
      loadStartMorph().then((module) => {
        morphStartRef.current = module.morphStartIntoCard;
      }),
    [],
  );
  const startWithMorph = (start: () => void) => {
    // The button as it stands at the tap, for the morph: read before the
    // recording begins, which takes it off the screen.
    const startButton = document.querySelector<HTMLElement>(`[${START_BUTTON_ATTR}]`);
    start();
    // After the start, never before it: the morph holds nothing back.
    if (startButton) morphStartRef.current?.(startButton);
  };
  return { fetchAhead, startWithMorph };
}

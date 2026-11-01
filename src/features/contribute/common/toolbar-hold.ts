import { useEffect, useSyncExternalStore } from 'react';

/*
 * The page's toolbar stands over Record, History and Account (contribute-page.tsx), above their
 * screens. A question asked on one of them (Logout, Delete) dims that screen and holds the
 * keyboard, so while one is open the toolbar steps out of sight and out of reach: no tab can be
 * pressed past the question.
 */

let openQuestions = 0;
const listeners = new Set<() => void>();
const tell = () => {
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Holds the toolbar for as long as the calling question is on screen. */
export function useHoldToolbar(): void {
  useEffect(() => {
    openQuestions += 1;
    tell();
    return () => {
      openQuestions -= 1;
      tell();
    };
  }, []);
}

/** Whether a question is open, so the toolbar steps aside. */
export function useIsToolbarHeld(): boolean {
  return useSyncExternalStore(subscribe, () => openQuestions > 0);
}

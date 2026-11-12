import { useEffect, useRef } from 'react';

/** Marks the history entry this page adds while something is open. */
const MARK = 'paraOpen';

const isOurs = (state: unknown): boolean =>
  typeof state === 'object' && state !== null && MARK in state;

/**
 * The browser's Back, and Android's, takes away what is open instead of leaving the page: while
 * `isOpen`, the page keeps one history entry of its own on top, with the same address, and a Back
 * off it runs `onBack`. Something still open after that gets the entry again, so each Back takes
 * one thing away; with nothing open the entry is gone and Back leaves as it always did.
 * `onBack` must take something away every time, or Back could never leave.
 */
export function useBackCloses(isOpen: boolean, onBack: () => void): void {
  const latest = useRef({ isOpen, onBack });
  // The page's own step back off its entry is on its way: its popstate is not the commuter's Back.
  const isSteppingBack = useRef(false);

  // After every render, not only as `isOpen` turns: a Back that leaves another card open has
  // taken the entry, and that card needs it again.
  useEffect(() => {
    latest.current = { isOpen, onBack };
    if (isSteppingBack.current) return;
    const isOnTop = isOurs(window.history.state);
    if (isOpen && !isOnTop) window.history.pushState({ [MARK]: true }, '');
    else if (!isOpen && isOnTop) {
      isSteppingBack.current = true;
      window.history.back();
    }
  });

  useEffect(() => {
    const handlePop = (event: PopStateEvent) => {
      const { isOpen: isOpenNow, onBack: back } = latest.current;
      const isOnTop = isOurs(event.state);
      if (isSteppingBack.current) {
        isSteppingBack.current = false;
        // Something opened while the step back was on its way.
        if (isOpenNow && !isOnTop) window.history.pushState({ [MARK]: true }, '');
      } else if (isOpenNow && !isOnTop) back();
      else if (!isOpenNow && isOnTop) {
        // Forward, onto the entry of something long closed: off it again.
        isSteppingBack.current = true;
        window.history.back();
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);
}

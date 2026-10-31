import { useSyncExternalStore } from 'react';

import { moveBetweenScreens } from './tab-motion';

export interface HashView {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Leaves this screen for the one shown at `hash`, the screen it was opened from. */
  closeTo: (hash: string) => void;
  /** Leaves this screen for the one at `hash` in its place, wherever it was opened from. */
  replaceWith: (hash: string) => void;
}

/**
 * A screen that shows while the URL's hash is `hash`, so a reload stays on it and the browser's
 * Back returns to the screen under it. A hash never reaches the service worker, which answers
 * the page by its path alone. Each screen has its own store; the hook is made once per screen.
 */
export function createHashView(hash: string): () => HashView {
  // Whether opening the screen added a history entry this page load, so the in-page back button
  // can pop it. After a reload there is none to pop: Back would leave the page.
  let hasPushedEntry = false;

  const subscribe = (listener: () => void): (() => void) => {
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  };

  const isOpenNow = (): boolean => window.location.hash === hash;

  // Each move says whether it changed anything: one that did not has nothing to show.
  const openNow = (): boolean => {
    if (isOpenNow()) return false;
    hasPushedEntry = true;
    window.location.hash = hash;
    return true;
  };

  const closeNow = (): boolean => {
    if (!isOpenNow()) return false;
    if (hasPushedEntry) {
      hasPushedEntry = false;
      window.history.back();
      return true;
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    // Every screen's store is told, as a hashchange: replaceState itself fires none.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return true;
  };

  // Back, when this page load opened the screen from the one at `hash`; after a reload there is no
  // entry to go back to, so the URL is replaced and every screen's store told, as a hashchange.
  const closeToNow = (target: string): boolean => {
    if (!isOpenNow()) return false;
    if (hasPushedEntry) {
      hasPushedEntry = false;
      window.history.back();
      return true;
    }
    return replaceWithNow(target);
  };

  // Every screen's store is told, as a hashchange: replaceState itself fires none.
  const replaceWithNow = (target: string): boolean => {
    if (!isOpenNow()) return false;
    hasPushedEntry = false;
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search + target,
    );
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return true;
  };

  // Every move is shown as one: the screens slide the way the toolbar's tabs run (tab-motion.ts).
  const open = () => moveBetweenScreens(openNow);
  const close = () => moveBetweenScreens(closeNow);
  const closeTo = (target: string) => moveBetweenScreens(() => closeToNow(target));
  const replaceWith = (target: string) => moveBetweenScreens(() => replaceWithNow(target));

  function useHashView(): HashView {
    const isOpen = useSyncExternalStore(subscribe, isOpenNow);
    return { isOpen, open, close, closeTo, replaceWith };
  }
  return useHashView;
}

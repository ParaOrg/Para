import { useSyncExternalStore } from 'react';

import type { ScreenHash } from './screen-routes';
import { moveBetweenScreens } from '../motion/tab-motion';

export interface HashView {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  /** Leaves this screen for the one shown at `hash`, the screen it was opened from. */
  closeTo: (hash: ScreenHash) => void;
  /** Leaves this screen for the one at `hash` in its place, wherever it was opened from. */
  replaceWith: (hash: ScreenHash) => void;
}

/**
 * A screen that shows while the URL's hash is `hash`, so a reload stays on it and the browser's
 * Back returns to the screen under it. A hash never reaches the service worker, which answers
 * the page by its path alone. Each screen has its own store; the hook is made once per screen.
 */
export function createHashView(hash: ScreenHash): () => HashView {
  // Whether opening the screen added a history entry this page load, so the in-page back button
  // can pop it. After a reload there is none to pop: Back would leave the page.
  let hasPushedEntry = false;

  const subscribe = (listener: () => void): (() => void) => {
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  };

  const isOpenNow = (): boolean => window.location.hash === hash;

  // A history entry of its own, so Back returns to the screen under it. Pushed rather than set as
  // `location.hash`, whose hashchange comes a task later: every screen's store is told at once, so
  // the move's view transition draws the new screen in the tap's own turn (tab-motion.ts).
  const openNow = () => {
    hasPushedEntry = true;
    window.history.pushState(null, '', window.location.pathname + window.location.search + hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  const closeNow = () => {
    if (hasPushedEntry) {
      hasPushedEntry = false;
      window.history.back();
      return;
    }
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    // Every screen's store is told, as a hashchange: replaceState itself fires none.
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  // Back, when this page load opened the screen from the one at `hash`; after a reload there is no
  // entry to go back to, so the URL is replaced and every screen's store told, as a hashchange.
  const closeToNow = (target: ScreenHash) => {
    if (hasPushedEntry) {
      hasPushedEntry = false;
      window.history.back();
      return;
    }
    replaceWithNow(target);
  };

  // Every screen's store is told, as a hashchange: replaceState itself fires none.
  const replaceWithNow = (target: ScreenHash) => {
    hasPushedEntry = false;
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search + target,
    );
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  // Every move is shown as one: the screens slide the way the toolbar's tabs run (tab-motion.ts).
  // Each moves only from where it can: open when this screen is not showing, the rest when it is.
  const isShut = () => !isOpenNow();
  const open = () => moveBetweenScreens(isShut, openNow);
  const close = () => moveBetweenScreens(isOpenNow, closeNow);
  const closeTo = (target: ScreenHash) => moveBetweenScreens(isOpenNow, () => closeToNow(target));
  const replaceWith = (target: ScreenHash) =>
    moveBetweenScreens(isOpenNow, () => replaceWithNow(target));

  function useHashView(): HashView {
    const isOpen = useSyncExternalStore(subscribe, isOpenNow);
    return { isOpen, open, close, closeTo, replaceWith };
  }
  return useHashView;
}

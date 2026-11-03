import { useSyncExternalStore } from 'react';

import { rideHashOf, rideIdOf, type ScreenHash } from './screen-routes';
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

/** The moves a screen makes, the same whether its hash is fixed or carries a ride's id. */
interface ScreenMoves {
  /** Shows the screen at `target`, a history entry of its own. */
  openAt: (target: string) => void;
  close: () => void;
  closeTo: (hash: ScreenHash) => void;
  replaceWith: (hash: ScreenHash) => void;
}

const subscribe = (listener: () => void): (() => void) => {
  window.addEventListener('hashchange', listener);
  return () => window.removeEventListener('hashchange', listener);
};

/**
 * The moves of the screen that shows while `isOpenNow`. A hash never reaches the service worker,
 * which answers the page by its path alone.
 */
function screenMoves(isOpenNow: () => boolean): ScreenMoves {
  // Whether opening the screen added a history entry this page load, so the in-page back button
  // can pop it. After a reload there is none to pop: Back would leave the page.
  let hasPushedEntry = false;

  // A history entry of its own, so Back returns to the screen under it. Pushed rather than set as
  // `location.hash`, whose hashchange comes a task later: every screen's store is told at once, so
  // the move's view transition draws the new screen in the tap's own turn (tab-motion.ts).
  const openNow = (target: string) => {
    hasPushedEntry = true;
    window.history.pushState(null, '', window.location.pathname + window.location.search + target);
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

  // Back, when this page load opened the screen from the one at `hash`; after a reload there is no
  // entry to go back to, so the URL is replaced.
  const closeToNow = (target: ScreenHash) => {
    if (hasPushedEntry) {
      hasPushedEntry = false;
      window.history.back();
      return;
    }
    replaceWithNow(target);
  };

  // Every move is shown as one: the screens slide the way the toolbar's tabs run (tab-motion.ts).
  // Each moves only from where it can: open when this screen is not showing, the rest when it is.
  const isShut = () => !isOpenNow();
  return {
    openAt: (target) => moveBetweenScreens(isShut, () => openNow(target)),
    close: () => moveBetweenScreens(isOpenNow, closeNow),
    closeTo: (target) => moveBetweenScreens(isOpenNow, () => closeToNow(target)),
    replaceWith: (target) => moveBetweenScreens(isOpenNow, () => replaceWithNow(target)),
  };
}

/**
 * A screen that shows while the URL's hash is `hash`, so a reload stays on it and the browser's
 * Back returns to the screen under it. Each screen has its own store; the hook is made once per
 * screen.
 */
export function createHashView(hash: ScreenHash): () => HashView {
  const isOpenNow = (): boolean => window.location.hash === hash;
  const { openAt, close, closeTo, replaceWith } = screenMoves(isOpenNow);
  const open = () => openAt(hash);

  function useHashView(): HashView {
    const isOpen = useSyncExternalStore(subscribe, isOpenNow);
    return { isOpen, open, close, closeTo, replaceWith };
  }
  return useHashView;
}

export interface RideView {
  /** The recording whose screen shows, or null when none does. */
  rideId: string | null;
  /** Shows the recording's screen, from the one showing now. */
  open: (rideId: string) => void;
  /** Leaves the ride for the screen at `hash`, the one it was opened from. */
  closeTo: (hash: ScreenHash) => void;
  /** Leaves the ride for the screen at `hash` in its place, wherever it was opened from. */
  replaceWith: (hash: ScreenHash) => void;
}

/** The ride screen, at `#ride/<id>`: the same moves as a fixed screen, the hash naming its ride. */
export function createRideView(): () => RideView {
  const rideIdNow = (): string | null => rideIdOf(window.location.hash);
  const { openAt, closeTo, replaceWith } = screenMoves(() => rideIdNow() !== null);
  const open = (rideId: string) => openAt(rideHashOf(rideId));

  function useRideView(): RideView {
    const rideId = useSyncExternalStore(subscribe, rideIdNow);
    return { rideId, open, closeTo, replaceWith };
  }
  return useRideView;
}

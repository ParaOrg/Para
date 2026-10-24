import { useSyncExternalStore } from 'react';

const HISTORY_HASH = '#history';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

// Whether opening History added a history entry this page load, so the in-page back button can
// pop it. After a reload there is none to pop: Back would leave the page.
let hasPushedEntry = false;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  window.addEventListener('hashchange', listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('hashchange', listener);
  };
};

const isOpenNow = (): boolean => window.location.hash === HISTORY_HASH;

interface HistoryView {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const open = () => {
  if (isOpenNow()) return;
  hasPushedEntry = true;
  window.location.hash = HISTORY_HASH;
};

const close = () => {
  if (!isOpenNow()) return;
  if (hasPushedEntry) {
    hasPushedEntry = false;
    window.history.back();
    return;
  }
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  notify();
};

/**
 * Whether History is showing, kept in the URL's `#history` so a reload stays on it and the
 * browser's Back returns to the Ready screen. A hash never reaches the service worker, which
 * answers the page by its path alone.
 */
export function useHistoryView(): HistoryView {
  const isOpen = useSyncExternalStore(subscribe, isOpenNow);
  return { isOpen, open, close };
}

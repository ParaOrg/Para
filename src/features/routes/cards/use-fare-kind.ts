import { useSyncExternalStore } from 'react';

/** Which fare the trip card's tile shows: Regular, or Discounted (students, seniors, PWDs). */
type FareKind = 'regular' | 'discounted';

/**
 * The fare a rider picked on the tile, kept for every trip since and the next visit too, so a rider
 * need not keep tapping. Remembered on the device only, and only once Discounted is picked, as the
 * basemap is: a commuter who never taps it leaves the browser's storage empty, which the commuter
 * test asserts.
 */
const STORAGE_KEY = 'parapo.fare.v1';

function read(): FareKind {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'discounted' ? 'discounted' : 'regular';
  } catch {
    return 'regular';
  }
}

let current: FareKind = read();
const listeners = new Set<() => void>();

function setFareKind(kind: FareKind): void {
  current = kind;
  try {
    if (kind === 'regular') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, kind);
  } catch {
    // Private mode or blocked storage: the choice lasts for this page only.
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** The fare picked, one for the whole app, and how to pick the other. */
export function useFareKind(): [FareKind, (kind: FareKind) => void] {
  return [
    useSyncExternalStore(
      subscribe,
      () => current,
      () => 'regular',
    ),
    setFareKind,
  ];
}

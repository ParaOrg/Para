import type * as AccountViewChunk from './account/account-view';
import { retryingImport } from './common/retrying-import';
import type * as HistoryViewChunk from './history/history-view';

/*
 * The toolbar's screens over the map, History and Account (with its settings), each its own chunk
 * so the page's first load does not carry them. They are fetched ahead once Start is idle, and
 * again as a finger lands on their tab, so a move to one never waits on the network.
 *
 * Each chunk is fetched once: every ask while it is on its way shares that one fetch, and once
 * here it is kept and handed straight back, so the page draws it without suspending (drawn
 * through React.lazy, a first mount suspends once even with the chunk in hand, and React holds
 * a revealed Suspense boundary back some 300 ms). A fetch that failed (offline) is let go, so the
 * next ask tries afresh (retryingImport).
 */

interface ScreenChunk<T> {
  /** The chunk, fetched once and kept. */
  load: () => Promise<T>;
  /** The chunk if it is already here, to be drawn without suspending. */
  loaded: () => T | null;
}

function screenChunk<T>(fetchChunk: () => Promise<T>): ScreenChunk<T> {
  let held: T | null = null;
  let onItsWay: Promise<T> | null = null;
  const load = (): Promise<T> => {
    if (held) return Promise.resolve(held);
    onItsWay ??= fetchChunk().then(
      (chunk) => (held = chunk),
      (error: unknown) => {
        onItsWay = null;
        throw error;
      },
    );
    return onItsWay;
  };
  return { load, loaded: () => held };
}

/** History's chunk. */
export const historyChunk = screenChunk<typeof HistoryViewChunk>(
  retryingImport(() => import('./history/history-view')),
);
/** Account's chunk, Account settings with it. */
export const accountChunk = screenChunk<typeof AccountViewChunk>(
  retryingImport(() => import('./account/account-view')),
);

/** Fetches a tab's screen ahead of its move: on a finger landing on the tab, and once Start is idle. */
export function warmScreen(tab: 'record' | 'history' | 'account'): void {
  if (tab === 'record') return;
  const chunk = tab === 'history' ? historyChunk : accountChunk;
  chunk.load().catch((error: unknown) => {
    console.warn(
      `The ${tab} screen could not be fetched ahead; it is fetched again on the tap.`,
      error,
    );
  });
}

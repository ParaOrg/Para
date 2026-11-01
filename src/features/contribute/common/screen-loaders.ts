import { retryingImport } from './retrying-import';
import type * as AccountViewChunk from '../account/account-view';
import type * as HistoryViewChunk from '../history/history-view';

/*
 * The toolbar's screens over the map, History and Account (with its settings), each its own chunk
 * so the page's first load does not carry them. They are fetched ahead once Start is idle, and
 * again as a finger lands on their tab, so a move to one never waits on the network. A fetch
 * ahead that failed (offline) is not kept failed: the next asks again afresh (retryingImport).
 *
 * A fetched screen is kept here so the page can draw it straight away (loadedHistoryView): drawn
 * through React.lazy, its first mount suspends once even with the chunk in hand, and React holds a
 * revealed Suspense boundary back for some 300 ms, so the move's view transition would wait.
 */

type HistoryViewModule = typeof HistoryViewChunk;
type AccountViewModule = typeof AccountViewChunk;

let historyView: HistoryViewModule | null = null;
let accountView: AccountViewModule | null = null;

const importHistoryView = retryingImport(() => import('../history/history-view'));
const importAccountView = retryingImport(() => import('../account/account-view'));

/** History's chunk, kept once fetched. */
export const loadHistoryView = (): Promise<HistoryViewModule> =>
  importHistoryView().then((module) => (historyView = module));
/** Account's chunk (Account settings with it), kept once fetched. */
export const loadAccountView = (): Promise<AccountViewModule> =>
  importAccountView().then((module) => (accountView = module));

/** History's chunk if it is already here, to be drawn without suspending. */
export const loadedHistoryView = (): HistoryViewModule | null => historyView;
/** Account's chunk if it is already here, to be drawn without suspending. */
export const loadedAccountView = (): AccountViewModule | null => accountView;

/** Fetches a tab's screen ahead of its move: on a finger landing on the tab, and once Start is idle. */
export function warmScreen(tab: 'record' | 'history' | 'account'): void {
  if (tab === 'record') return;
  const load = tab === 'history' ? loadHistoryView : loadAccountView;
  load().catch((error: unknown) => {
    console.warn(
      `The ${tab} screen could not be fetched ahead; it is fetched again on the tap.`,
      error,
    );
  });
}

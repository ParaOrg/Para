import type { ToastAction } from '@/shared/ui/toast';

import type { LoadProblems } from './load-problems';

interface LoadProblemHandlers {
  /** How many times Try again has been answered: a try that fails again says it again. */
  tries: number;
  onTryAgain: () => void;
  /** The too-new map's Reload: the newer app, through the worker (pwa.ts). */
  onReloadNewer: () => void;
}

/** A failed load as a problem toast says it; the page adds the warning drawing. */
export interface LoadProblemToast {
  id: string;
  /** Raised by each Try again answered (StandingToast's `saying`). */
  saying: number;
  title: string;
  body: string;
  action: ToastAction;
}

/** One id, so the too-new map's words take the failed load's place rather than stack. */
const LOAD_PROBLEM_ID = 'map-load';

/**
 * A failed load of the published map as a problem toast, never a blank page: Try again; or, for a
 * map published for a newer app, Reload, since loading it again cannot help and the newer app can
 * (pwa.ts, reloadForNewerApp). Null while the map loads fine.
 */
export function loadProblemToast(
  problems: LoadProblems,
  { tries, onTryAgain, onReloadNewer }: LoadProblemHandlers,
): LoadProblemToast | null {
  if (!problems.loadFailed) return null;
  if (problems.tooNew) {
    return {
      id: LOAD_PROBLEM_ID,
      saying: tries,
      title: 'This map needs a newer Para',
      body: 'Reload to update the app.',
      action: { label: 'Reload', onAction: onReloadNewer },
    };
  }
  return {
    id: LOAD_PROBLEM_ID,
    saying: tries,
    title: 'The routes could not load',
    body: 'Check your connection and try again.',
    action: { label: 'Try again', onAction: onTryAgain },
  };
}

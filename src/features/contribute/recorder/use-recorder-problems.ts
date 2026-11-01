import { useCallback, useRef, useState } from 'react';

import type { PageProblem } from '../notices/page-problem';
import { OTHER_TAB_PROBLEM, STORAGE_PROBLEM } from '../notices/recorder-problems';

export interface RecorderProblems {
  /** What the contributor should know went wrong: storage first, then location. */
  problem: PageProblem | null;
  /** Says the phone could not keep the recording. */
  reportStore: (error: unknown) => void;
  /** Says another tab holds the recorder, and keeps saying so on every Start. */
  showOtherTab: () => void;
  /** Whether another tab holds the recorder; if so, says so again. */
  refuseIfOtherTab: () => boolean;
  /** Clears what storage said, once a recording starts afresh or is kept. */
  clearStorageProblem: () => void;
  /** What the last location request came to: a problem, or null once a fix arrives. */
  setLocationProblem: (problem: PageProblem | null) => void;
}

/**
 * The recorder's two slots for what went wrong, so a location error never hides a storage
 * failure: storage stays until a new recording starts, location clears when the next fix arrives.
 */
export function useRecorderProblems(): RecorderProblems {
  const [storageProblem, setStorageProblem] = useState<PageProblem | null>(null);
  const [locationProblem, setLocationProblem] = useState<PageProblem | null>(null);
  // Another tab holds the recorder: this one shows why and starts nothing.
  const isOtherTab = useRef(false);

  const reportStore = useCallback((error: unknown) => {
    console.error('IndexedDB failed.', error);
    setStorageProblem(STORAGE_PROBLEM);
  }, []);

  const showOtherTab = useCallback(() => {
    isOtherTab.current = true;
    setStorageProblem(OTHER_TAB_PROBLEM);
  }, []);

  function refuseIfOtherTab() {
    if (isOtherTab.current) setStorageProblem(OTHER_TAB_PROBLEM);
    return isOtherTab.current;
  }

  return {
    problem: storageProblem ?? locationProblem,
    reportStore,
    showOtherTab,
    refuseIfOtherTab,
    clearStorageProblem: () => setStorageProblem(null),
    setLocationProblem,
  };
}

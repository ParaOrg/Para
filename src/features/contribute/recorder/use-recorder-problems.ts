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
  /** This tab was handed the recorder: the other-tab warning goes, and Start records again. */
  clearOtherTab: () => void;
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
 * Location is the recorder's to say only while it records (`isRecording`): a ride stopped with no
 * fix since leaves it behind, and it would hold the one location toast against the locate
 * button's own note (PageToasts), stale, or closed and so silent.
 */
export function useRecorderProblems(isRecording: boolean): RecorderProblems {
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

  // The other tab went and this one holds the recorder now: its warning goes, and Start records.
  const clearOtherTab = useCallback(() => {
    isOtherTab.current = false;
    setStorageProblem((problem) => (problem === OTHER_TAB_PROBLEM ? null : problem));
  }, []);

  function refuseIfOtherTab() {
    if (isOtherTab.current) setStorageProblem(OTHER_TAB_PROBLEM);
    return isOtherTab.current;
  }

  return {
    problem: storageProblem ?? (isRecording ? locationProblem : null),
    reportStore,
    showOtherTab,
    clearOtherTab,
    refuseIfOtherTab,
    clearStorageProblem: () => setStorageProblem(null),
    setLocationProblem,
  };
}

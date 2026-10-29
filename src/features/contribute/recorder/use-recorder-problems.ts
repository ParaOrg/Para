import { useCallback, useRef, useState } from 'react';

const STORE_PROBLEM =
  'This phone could not keep the recording. Close other tabs of this page and try again.';
const OTHER_TAB_PROBLEM =
  'Para is open in another tab. Record in that tab, or close it and reload this one.';

export interface RecorderProblems {
  /** What the contributor should know went wrong, in words: storage first, then location. */
  problem: string | null;
  /** Says the phone could not keep the recording. */
  reportStore: (error: unknown) => void;
  /** Says another tab holds the recorder, and keeps saying so on every Start. */
  showOtherTab: () => void;
  /** Whether another tab holds the recorder; if so, says so again. */
  refuseIfOtherTab: () => boolean;
  /** Clears what storage said, once a recording starts afresh or is kept. */
  clearStorageProblem: () => void;
  /** What the last location request came to: a problem in words, or null once a fix arrives. */
  setLocationProblem: (problem: string | null) => void;
}

/**
 * The recorder's two slots for what went wrong, so a location error never hides a storage
 * failure: storage stays until a new recording starts, location clears when the next fix arrives.
 */
export function useRecorderProblems(): RecorderProblems {
  const [storageProblem, setStorageProblem] = useState<string | null>(null);
  const [locationProblem, setLocationProblem] = useState<string | null>(null);
  // Another tab holds the recorder: this one shows why and starts nothing.
  const isOtherTab = useRef(false);

  const reportStore = useCallback((error: unknown) => {
    console.error('IndexedDB failed.', error);
    setStorageProblem(STORE_PROBLEM);
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

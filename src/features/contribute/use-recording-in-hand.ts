import { useCallback, useRef, useState, type RefObject } from 'react';

import { keptFixes, type Fix } from '@/features/routes/model/ride-recording';

import type { Recording } from './recording-schema';
import { putRecording } from './recording-store';

export interface RecordingInHand {
  /** The recording being made, or stopped and not yet saved; null on Ready. */
  current: Recording | null;
  /** Every fix the phone reported for it, in order. */
  fixes: Fix[];
  /** The fixes that count, worked out once per fix. */
  kept: Fix[];
  /** The recording and its fixes as handlers read them, ahead of the next render. */
  currentRef: RefObject<Recording | null>;
  fixesRef: RefObject<Fix[]>;
  /** Makes this the recording in hand and writes it to the phone. */
  keep: (recording: Recording) => void;
  /** Makes this the recording in hand as the phone already holds it, with its fixes. */
  hold: (recording: Recording, fixes: Fix[]) => void;
  /** Makes this the list of fixes. */
  setFixList: (fixes: Fix[]) => void;
  /** Puts down the recording in hand and its fixes. */
  forget: () => void;
}

/**
 * The recording in hand and its fixes: in state for the screens, and beside it in refs for the
 * handlers, which write it without waiting for a render.
 */
export function useRecordingInHand(reportStore: (error: unknown) => void): RecordingInHand {
  const [current, setCurrent] = useState<Recording | null>(null);
  // The fixes and the ones that count, set together: the rules run once per fix, not once per render.
  const [{ fixes, kept }, setTrack] = useState<{ fixes: Fix[]; kept: Fix[] }>({
    fixes: [],
    kept: [],
  });
  const currentRef = useRef<Recording | null>(null);
  const fixesRef = useRef<Fix[]>([]);

  const setFixList = useCallback((list: Fix[]) => {
    fixesRef.current = list;
    setTrack({ fixes: list, kept: keptFixes(list) });
  }, []);

  const keep = useCallback(
    (recording: Recording) => {
      currentRef.current = recording;
      setCurrent(recording);
      putRecording(recording).catch(reportStore);
    },
    [reportStore],
  );

  // Stable, so the page's load can call it from an effect.
  const hold = useCallback(
    (recording: Recording, list: Fix[]) => {
      currentRef.current = recording;
      setCurrent(recording);
      setFixList(list);
    },
    [setFixList],
  );

  function forget() {
    currentRef.current = null;
    setCurrent(null);
    setFixList([]);
  }

  return { current, fixes, kept, currentRef, fixesRef, keep, hold, setFixList, forget };
}

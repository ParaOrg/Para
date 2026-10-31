import { useCallback, type RefObject } from 'react';

import { useFixWrites, type FixWrites } from './use-fix-writes';
import type { Recording } from '../storage/recording-schema';

export interface RecordingFixWrites extends FixWrites {
  /**
   * Puts a fix write that failed after the Stop on the stopped recording too, so the
   * form says part of the recording could not be kept.
   */
  noteFailedWrites: (failedCount: number) => void;
}

/** The recording in hand's fix writes: a failed one is reported and counted on the recording. */
export function useRecordingFixWrites(
  currentRef: RefObject<Recording | null>,
  keep: (recording: Recording) => void,
  reportStore: (error: unknown) => void,
): RecordingFixWrites {
  const noteFailedWrites = useCallback(
    (failedCount: number) => {
      const recording = currentRef.current;
      if (!recording || recording.status === 'recording') return;
      if (recording.failedFixWrites === failedCount) return;
      keep({ ...recording, failedFixWrites: failedCount });
    },
    [currentRef, keep],
  );

  const fixWrites = useFixWrites((error, failedCount) => {
    reportStore(error);
    noteFailedWrites(failedCount);
  });
  return { ...fixWrites, noteFailedWrites };
}

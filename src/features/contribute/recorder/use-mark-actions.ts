import type { RefObject } from 'react';

import { markedRecording, notedRecording } from './recording-marks';
import type { Recording } from '../storage/recording-schema';

/** What the recorder does with its flagged stops. */
export interface MarkActions {
  /** Marks the place the ride is at: the time of the tap. False if it marked none. */
  markPlace: () => boolean;
  /** Sets the note of the flag at `index`, or takes it off when empty. False if there is no such flag. */
  noteMark: (index: number, note: string) => boolean;
}

/**
 * The flagged stops' actions on the recording in hand: each change kept at once, as every change
 * to a recording is (useRecordingInHand's keep). Notes may be written while recording, paused or
 * on the save form, as long as the recording is in hand.
 */
export function useMarkActions(
  currentRef: RefObject<Recording | null>,
  keep: (recording: Recording) => void,
): MarkActions {
  return {
    markPlace: () => {
      const recording = currentRef.current;
      const marked = recording && markedRecording(recording, Date.now());
      if (!marked) return false;
      // Said by the page's "Stop flagged" toast, not the status line: one word for one flag.
      keep(marked.recording);
      return true;
    },
    noteMark: (index, note) => {
      const recording = currentRef.current;
      const noted = recording && notedRecording(recording, index, note);
      if (!noted) return false;
      keep(noted);
      return true;
    },
  };
}

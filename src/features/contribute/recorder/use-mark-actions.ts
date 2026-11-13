import type { RefObject } from 'react';

import { markedRecording, notedRecording, unmarkedRecording } from './recording-marks';
import type { Recording } from '../storage/recording-schema';

/** What the recorder does with its flagged stops. */
export interface MarkActions {
  /** Marks the place the ride is at: the time of the tap. False if it marked none. */
  markPlace: () => boolean;
  /** Sets the note of the flag at `time`, or takes it off when empty. False if there is none. */
  noteMark: (time: number, note: string) => boolean;
  /** Takes the flag at `time` off the ride, its note with it. False if there is none. */
  deleteMark: (time: number) => boolean;
}

/**
 * The flagged stops' actions on the recording in hand: each change kept at once, as every change
 * to a recording is (useRecordingInHand's keep). Notes may be written while recording, paused or
 * on the save form, as long as the recording is in hand, but not while it is being saved: the
 * save writes the recording as it was when it began, and a note kept then would undo the save.
 *
 * A hook by name only: it calls none, but the refs it is handed may only go to a hook in render.
 */
export function useMarkActions(
  currentRef: RefObject<Recording | null>,
  keep: (recording: Recording) => void,
  isSaving: () => boolean,
  announce: (words: string) => void,
): MarkActions {
  return {
    markPlace: () => {
      const recording = currentRef.current;
      const marked = recording && markedRecording(recording, Date.now());
      if (!marked) return false;
      keep(marked.recording);
      // The pill that follows is seen, not heard: the page's status line says the flag.
      announce(`Stop ${marked.count} flagged`);
      return true;
    },
    noteMark: (time, note) => {
      const recording = isSaving() ? null : currentRef.current;
      const noted = recording && notedRecording(recording, time, note);
      if (!noted) return false;
      keep(noted);
      return true;
    },
    deleteMark: (time) => {
      const recording = isSaving() ? null : currentRef.current;
      const left = recording && unmarkedRecording(recording, time);
      if (!left) return false;
      keep(left);
      return true;
    },
  };
}

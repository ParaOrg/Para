import { useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import type { RecordingState } from '../recorder/recording-state';

type StopNoteRecording = Pick<RecordingState, 'phase' | 'current' | 'noteMark'>;

export interface StopNote {
  /** The note's sheet shows, over the recording screen. */
  isShown: boolean;
  /** The note of the flag being written, as it stands: empty for none. */
  note: string;
  /** Flag a stop: focus goes back to it as the sheet closes. */
  flagButtonRef: RefObject<HTMLButtonElement | null>;
  /** "Add a note" on the Stop flagged toast: the sheet opens on the latest flag. */
  openLatest: () => void;
  save: (note: string) => void;
  close: () => void;
}

/**
 * The note on a stop just flagged, from the Stop flagged toast. It belongs to the recording
 * screen, so it is dropped the moment the page leaves it, as ✕'s question is (use-stop-question.ts).
 */
export function useStopNote(recording: StopNoteRecording): StopNote {
  const { phase, current } = recording;
  const isOnRecordingScreen = phase === 'recording' || phase === 'paused';
  // The flag being written on, by its place among the ride's flags; null while no sheet shows.
  const [index, setIndex] = useState<number | null>(null);
  if (!isOnRecordingScreen && index !== null) setIndex(null);
  const flagButtonRef = useRef<HTMLButtonElement>(null);
  const marks = current?.marks ?? [];
  const close = () => {
    flushSync(() => setIndex(null));
    flagButtonRef.current?.focus();
  };
  return {
    isShown: isOnRecordingScreen && index !== null,
    note: (index === null ? undefined : marks.at(index)?.note) ?? '',
    flagButtonRef,
    openLatest: () => {
      if (isOnRecordingScreen && marks.length > 0) setIndex(marks.length - 1);
    },
    save: (note) => {
      if (index !== null) recording.noteMark(index, note);
      close();
    },
    close,
  };
}

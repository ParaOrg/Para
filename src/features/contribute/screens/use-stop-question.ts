import { useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import { isStopQuestionShown, stopQuestionIn, type StopAskedWhile } from './stop-question';
import type { RecordingState } from '../recorder/recording-state';

type StopQuestionRecording = Pick<RecordingState, 'phase' | 'stop' | 'resume' | 'cancel'>;

export interface StopQuestion {
  /** The question shows, over the whole screen. */
  isShown: boolean;
  /** The recording screen's ✕: focus returns to it once the recording screen is live again. */
  discardButtonRef: RefObject<HTMLButtonElement | null>;
  /** ✕: pauses the recording and asks. */
  ask: () => void;
  /** Keep recording: puts the recording back as it was when ✕ asked. */
  keep: () => void;
  stopWithoutSaving: () => void;
}

/**
 * ✕'s question, "stop without saving?": what the recording was doing when it was asked, so Keep
 * recording puts it back. It shows once the pause lands, and goes as the page leaves the recording
 * screen (stop-question.ts): dropped during render, as React does for state that follows other
 * state.
 */
export function useStopQuestion(recording: StopQuestionRecording): StopQuestion {
  const { phase } = recording;
  const [askedWhile, setAskedWhile] = useState<StopAskedWhile>(null);
  if (stopQuestionIn(phase, askedWhile) !== askedWhile) setAskedWhile(null);
  const discardButtonRef = useRef<HTMLButtonElement>(null);
  const ask = () => {
    setAskedWhile(phase === 'paused' ? 'paused' : 'recording');
    if (phase === 'recording') recording.stop();
  };
  const keep = () => {
    const wasRecording = askedWhile === 'recording';
    flushSync(() => setAskedWhile(null));
    if (wasRecording) recording.resume();
    discardButtonRef.current?.focus();
  };
  const stopWithoutSaving = () => {
    setAskedWhile(null);
    recording.cancel();
  };
  return {
    isShown: isStopQuestionShown(phase, askedWhile),
    discardButtonRef,
    ask,
    keep,
    stopWithoutSaving,
  };
}

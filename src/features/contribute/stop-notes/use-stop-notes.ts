import { useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import { markPoints } from './mark-points';
import type { StopNotesData, StopNotesViewKind } from './stop-notes-view';
import type { RecordingState } from '../recorder/recording-state';

type StopNotesRecording = Pick<
  RecordingState,
  'phase' | 'current' | 'kept' | 'noteMark' | 'deleteMark'
>;

export interface StopNotes {
  /**
   * The Add a stop note pill, for the latest flag: a count that grows with each flag, so the pill
   * is drawn afresh (its `key`) and its time starts again; null while no pill shows.
   */
  pill: number | null;
  /** A stop's card or Stops notes, open over the recording screen; null for neither. */
  view: StopNotesViewKind | null;
  /** The ride's flagged stops, where each was, and how to note or delete one. */
  data: StopNotesData;
  /** How many notes have been saved from a card: each one more says so in a toast. */
  notesAdded: number;
  /** Flag a stop and the Stops notes button: focus comes back to one as the card or page closes. */
  flagButtonRef: RefObject<HTMLButtonElement | null>;
  notesButtonRef: RefObject<HTMLButtonElement | null>;
  /** A stop just flagged: the pill shows for it, its time starting again. */
  showPill: () => void;
  /** The pill's time is up. */
  dropPill: () => void;
  /** The pill tapped: the card opens for its stop. */
  openCard: () => void;
  openScreen: () => void;
  close: () => void;
  /** A note saved from the card. */
  countNoteAdded: () => void;
}

/**
 * The stops' notes on the recording screen: the pill after each flag, the card it opens, and
 * Stops notes from its button. They belong to the recording screen, so each is dropped the moment
 * the page leaves it, as ✕'s question is (use-stop-question.ts).
 */
export function useStopNotes(recording: StopNotesRecording, areToastsDrawn: boolean): StopNotes {
  const { phase, current, kept } = recording;
  const isOnRecordingScreen = phase === 'recording' || phase === 'paused';
  const [pill, setPill] = useState<number | null>(null);
  const [flagsShown, setFlagsShown] = useState(0);
  const [view, setView] = useState<StopNotesViewKind | null>(null);
  const [notesAdded, setNotesAdded] = useState(0);
  // Back to none while the toasts are not drawn (signed out), so drawn again they never take an
  // old note for a new one.
  if (!areToastsDrawn && notesAdded !== 0) setNotesAdded(0);
  if (!isOnRecordingScreen && (pill !== null || view !== null)) {
    setPill(null);
    setView(null);
  }
  const flagButtonRef = useRef<HTMLButtonElement>(null);
  const notesButtonRef = useRef<HTMLButtonElement>(null);
  const marks = current?.marks ?? [];
  const close = () => {
    const wasScreen = view?.kind === 'screen';
    flushSync(() => setView(null));
    // Stops notes all deleted, its button is gone with them.
    (wasScreen
      ? (notesButtonRef.current ?? flagButtonRef.current)
      : flagButtonRef.current
    )?.focus();
  };
  return {
    pill: isOnRecordingScreen ? pill : null,
    view: isOnRecordingScreen ? view : null,
    data: {
      marks,
      points: markPoints(kept, marks),
      onNoteMark: recording.noteMark,
      onDeleteMark: recording.deleteMark,
    },
    notesAdded,
    flagButtonRef,
    notesButtonRef,
    showPill: () => {
      setPill(flagsShown + 1);
      setFlagsShown((shown) => shown + 1);
    },
    dropPill: () => setPill(null),
    // The pill is always the latest flag's: each flag draws it afresh.
    openCard: () => {
      const latest = marks.at(-1);
      if (latest) setView({ kind: 'card', time: latest.time });
      setPill(null);
    },
    openScreen: () => {
      setPill(null);
      setView({ kind: 'screen' });
    },
    close,
    countNoteAdded: () => setNotesAdded((added) => added + 1),
  };
}

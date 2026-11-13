import { useEffect, useRef } from 'react';

import { useToast } from '@/shared/ui/use-toast';

import { FlagStopIcon } from '../common/flag-stop-icon';

/** How long Stop flagged stays: a little longer than other news, to reach Add a note. */
export const STOP_FLAGGED_MS = 5000;

const STOP_FLAGGED_ID = 'stop-flagged';

interface StopFlaggedSaidProps {
  /** How many stops have been flagged on the page: each one more says "Stop flagged". */
  times: number;
  /** A problem stands: the toast is not said, then or later, as it would only wait behind it. */
  isQuiet: boolean;
  /** Off the recording screen Add a note has nowhere to open: the toast goes. */
  canAddNote: boolean;
  /** Add a note: opens the note of the latest flag. */
  onAddNote: () => void;
}

/**
 * "Stop flagged", with Add a note for the flag just made. The button goes with the toast, which
 * hides itself; the save form lists every flag with its note, so a note missed here is added
 * there (toast.tsx, on an info toast's action). Asked again while it shows, it is said in place.
 */
export function StopFlaggedSaid({ times, isQuiet, canAddNote, onAddNote }: StopFlaggedSaidProps) {
  const { showToast, hideToast } = useToast();
  // The count it last said at: a render with nothing new says nothing.
  const saidAt = useRef(0);
  // Read at the tap, not when it was asked: a toast that waited keeps the words it was asked with.
  const addNote = useRef(onAddNote);
  useEffect(() => {
    addNote.current = onAddNote;
  });
  // Tells the host's queue, which is told rather than rendered.
  useEffect(() => {
    if (!canAddNote) {
      hideToast(STOP_FLAGGED_ID);
      return;
    }
    if (times <= saidAt.current) return;
    saidAt.current = times;
    if (isQuiet) return;
    showToast({
      id: STOP_FLAGGED_ID,
      kind: 'info',
      icon: <FlagStopIcon />,
      title: 'Stop flagged',
      action: { label: 'Add a note', onAction: () => addNote.current() },
      durationMs: STOP_FLAGGED_MS,
    });
  }, [times, isQuiet, canAddNote, showToast, hideToast]);
  return null;
}

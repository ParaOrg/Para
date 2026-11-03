import { useCallback, useEffect, useState } from 'react';

import type { Recording } from './recording-schema';
import { deleteRecording, loadRecordings } from './recording-store';
import { SAVED_CHANNEL, tellSavedRecordingsChanged } from './saved-recordings-channel';

const savedOnly = (all: readonly Recording[]) => all.filter((r) => r.status === 'saved');

export interface SavedRecordings {
  /** Every recording saved on this phone, newest first. */
  saved: readonly Recording[];
  /** Lists the saved ones among every recording the phone holds. */
  listSaved: (all: readonly Recording[]) => void;
  /** Puts a recording just saved at the top of the list, and tells the other tabs. */
  addSaved: (recording: Recording) => void;
  /** Deletes a saved recording and its fixes from this phone. */
  deleteSaved: (recording: Recording) => void;
}

/**
 * The recordings saved on this phone, kept in step with its other tabs, and read again whenever
 * anything (a delete of the account) says they changed.
 */
export function useSavedRecordings(reportStore: (error: unknown) => void): SavedRecordings {
  const [saved, setSaved] = useState<Recording[]>([]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(SAVED_CHANNEL);
    channel.onmessage = () => {
      loadRecordings()
        .then((all) => setSaved(savedOnly(all)))
        .catch(reportStore);
    };
    return () => channel.close();
  }, [reportStore]);

  function addSaved(recording: Recording) {
    setSaved((list) => [recording, ...list.filter((r) => r.id !== recording.id)]);
    tellSavedRecordingsChanged();
  }

  function deleteSaved(recording: Recording) {
    deleteRecording(recording.id)
      .then(() => {
        setSaved((list) => list.filter((r) => r.id !== recording.id));
        tellSavedRecordingsChanged();
      })
      .catch(reportStore);
  }

  // Stable, so the page's load can call it from an effect.
  const listSaved = useCallback((all: readonly Recording[]) => setSaved(savedOnly(all)), []);

  return { saved, listSaved, addSaved, deleteSaved };
}

import { useState } from 'react';

import type { AccountGateState } from './account/use-account-gate';
import { useLatch } from './common/use-latch';
import type { MapNote, MapNoteGiven } from './notices/map-note';
import type { PageToastsProps } from './notices/page-toasts';
import type { RouteRecordedGiven } from './notices/route-recorded';
import { uploadFailedProblem } from './notices/upload-failed-problem';
import type { RecordingState } from './recorder/recording-state';
import type { Uploads } from './uploads/use-uploads';

type NoticesRecording = Pick<
  RecordingState,
  'phase' | 'problem' | 'isWakeRefused' | 'lastSaved' | 'markPlace'
>;

interface PageNoticesInput {
  recording: NoticesRecording;
  statusOf: Uploads['statusOf'];
  accountGate: AccountGateState;
  /**
   * A save just told: called during render, so it may only set state of the component that calls
   * this hook, as React allows while rendering.
   */
  onRouteRecorded: () => void;
  /** Add a note, on the Stop flagged toast. */
  onAddNote: () => void;
}

export interface PageNotices {
  /** What the page's toasts say now. */
  toasts: PageToastsProps;
  /** Whether a toast has had something to say: their code is fetched then, and kept. */
  hasHadToasts: boolean;
  /** The locator's note, or null when it is taken back. */
  handleMapNote: (note: MapNote | null) => void;
  /** Flag a stop: marks the place, and a toast says so. */
  handleFlag: () => void;
}

/**
 * Said in toasts at the top: what went wrong, until closed or fixed (the recorder's problem, a
 * recording running with the screen free to sleep), a stop just flagged and a route just saved.
 * Their code is fetched the first time there is one, then kept, to take them away once fixed.
 */
export function usePageNotices({
  recording,
  statusOf,
  accountGate,
  onRouteRecorded,
  onAddNote,
}: PageNoticesInput): PageNotices {
  const isScreenFreeToSleep = recording.phase === 'recording' && recording.isWakeRefused;
  // The locator's note: what it says, and a count that grows with each tap, said again each time.
  const [mapNote, setMapNote] = useState<MapNoteGiven | null>(null);
  const handleMapNote = (note: MapNote | null) =>
    setMapNote((given) => (note ? { note, timesGiven: (given?.timesGiven ?? 0) + 1 } : null));
  // The stops flagged while the toasts are drawn: one more says "Stop flagged". Back to none while
  // they are not (signed out), so drawn again they never take an old flag for a new one.
  const [stopsFlagged, setStopsFlagged] = useState(0);
  if (accountGate !== 'ready' && stopsFlagged !== 0) setStopsFlagged(0);
  const handleFlag = () => {
    if (recording.markPlace()) setStopsFlagged((flagged) => flagged + 1);
  };
  // Each route saved: back on Record, a toast says so and where it goes next, in words fixed at
  // the save. Back to none while the toasts are not drawn, as the flags are.
  const [routeRecorded, setRouteRecorded] = useState<RouteRecordedGiven | null>(null);
  const [toldOfSave, setToldOfSave] = useState(recording.lastSaved);
  if (recording.lastSaved !== toldOfSave) {
    setToldOfSave(recording.lastSaved);
    const saved = recording.lastSaved;
    if (saved) {
      const status = statusOf(saved);
      const isOnline = navigator.onLine;
      const failedFixWrites = saved.failedFixWrites ?? 0;
      setRouteRecorded((told) => ({
        status,
        isOnline,
        failedFixWrites,
        times: (told?.times ?? 0) + 1,
      }));
      onRouteRecorded();
    }
  }
  if (accountGate !== 'ready' && routeRecorded) setRouteRecorded(null);
  // The just-saved route's upload failing reaches the contributor on Record, not only in History.
  const uploadProblem = recording.lastSaved
    ? uploadFailedProblem(statusOf(recording.lastSaved))
    : null;
  const hasHadToasts = useLatch(
    recording.problem !== null ||
      isScreenFreeToSleep ||
      mapNote !== null ||
      stopsFlagged !== 0 ||
      routeRecorded !== null ||
      uploadProblem !== null,
  );
  return {
    toasts: {
      problem: recording.problem,
      isScreenFreeToSleep,
      mapNote,
      stopsFlagged,
      onAddNote,
      routeRecorded,
      uploadProblem,
    },
    hasHadToasts,
    handleMapNote,
    handleFlag,
  };
}

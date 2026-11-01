import { useEffect, type RefObject } from 'react';

import type { Fix } from '@/features/routes/model/ride-recording';

import { whenRecorderFreed } from './recorder-lock';
import { openRecorder } from './recorder-opening';
import { fixOfRow } from './recording-fixes';
import type { Phase } from './recording-state';
import { reopenPoint } from './recording-transitions';
import type { Recording } from '../storage/recording-schema';

interface RecorderOpeningOptions {
  listSaved: (all: readonly Recording[]) => void;
  hold: (recording: Recording, fixes: Fix[]) => void;
  resetFixWrites: (nextSeq: number, failedCount: number) => void;
  hasNativeLogProblemRef: RefObject<boolean>;
  reportStore: (error: unknown) => void;
  reportNativeLog: (error: unknown) => void;
  showOtherTab: () => void;
  clearOtherTab: () => void;
  setPhase: (phase: Phase) => void;
}

/**
 * Opens the recorder once, as the page opens: lists what the phone saved, takes back a
 * recording left open with its fixes, or shows that another tab holds the recorder. Then, if
 * that tab goes (closed, or reloaded: it lets go a moment after the new page asks), opens it
 * again here as a fresh page would, the warning gone. Every option must keep its identity
 * across renders, or the page would open again.
 */
export function useRecorderOpening({
  listSaved,
  hold,
  resetFixWrites,
  hasNativeLogProblemRef,
  reportStore,
  reportNativeLog,
  showOtherTab,
  clearOtherTab,
  setPhase,
}: RecorderOpeningOptions): void {
  useEffect(() => {
    let isCancelled = false;
    const open = () =>
      openRecorder({
        isCancelled: () => isCancelled,
        onListed: listSaved,
        onNativeLogProblem: (error) => {
          // The log stays on the phone, so a Save does not clear fixes that were never stored.
          hasNativeLogProblemRef.current = true;
          reportNativeLog(error);
        },
      })
        .then((opening) => {
          if (opening === null) return;
          if (opening.kind === 'other-tab') {
            showOtherTab();
            setPhase('ready');
            void whenRecorderFreed().then(() => {
              if (isCancelled) return;
              clearOtherTab();
              open();
            });
          } else if (opening.kind === 'open') {
            const { recording, rows } = opening;
            hold(recording, rows.map(fixOfRow));
            const reopened = reopenPoint(recording, rows);
            resetFixWrites(reopened.nextSeq, reopened.failedFixWrites);
            setPhase(reopened.phase);
          } else {
            setPhase('ready');
          }
        })
        .catch((error: unknown) => {
          if (isCancelled) return;
          reportStore(error);
          setPhase('ready');
        });
    open();
    return () => {
      isCancelled = true;
    };
  }, [
    listSaved,
    hold,
    resetFixWrites,
    hasNativeLogProblemRef,
    reportStore,
    reportNativeLog,
    showOtherTab,
    clearOtherTab,
    setPhase,
  ]);
}

import { useCallback, useState } from 'react';

import { locationProblem } from './location-problem';
import { keepsRecordingInBackground } from './native-fixes';
import { takeWatchedFixes } from './recording-fixes';
import { markedRecording } from './recording-marks';
import { MODE_LABEL, currentMode } from './recording-rules';
import type { Phase, RecordingState } from './recording-state';
import {
  newRecording,
  resumedRecording,
  stoppedRecording,
  switchedMode,
} from './recording-transitions';
import { useGeolocationWatch, type WatchedFix } from './use-geolocation-watch';
import { useHiddenGaps } from './use-hidden-gaps';
import { useLiveFigures } from './use-live-figures';
import { useNativeFinish } from './use-native-finish';
import { useRecorderOpening } from './use-recorder-opening';
import { useRecorderProblems } from './use-recorder-problems';
import { useRecordingFixWrites } from './use-recording-fix-writes';
import { useRecordingInHand } from './use-recording-in-hand';
import { useRecordingSave } from './use-recording-save';
import { useWakeLock } from './use-wake-lock';
import { useSavedRecordings } from '../storage/use-saved-recordings';

/**
 * The page's whole state: what phase it is in, the recording being made and
 * its fixes. Every fix goes to IndexedDB as it arrives; the hook only reads
 * it back on reopen. A saved recording stays in IndexedDB until the
 * contributor deletes it, uploaded or not (use-uploads.ts sends it).
 */
export function useRecording(): RecordingState {
  const [phase, setPhase] = useState<Phase>('loading');
  const [announcement, setAnnouncement] = useState('');
  const [focusTarget, setFocusTarget] = useState<'heading' | 'pause'>('heading');
  const problems = useRecorderProblems();
  const { reportStore, clearStorageProblem, setLocationProblem } = problems;

  // A native log that cannot be read leaves the ride with the fixes the page already holds.
  const reportNativeLog = useCallback((error: unknown) => {
    console.error('The fixes kept by the app could not be imported.', error);
  }, []);

  const { current, fixes, kept, currentRef, fixesRef, keep, hold, setFixList, forget } =
    useRecordingInHand(reportStore);

  const { writeFixes, writeAllFixes, failedFixWrites, resetFixWrites, noteFailedWrites } =
    useRecordingFixWrites(currentRef, keep, reportStore);
  const { isFinishingRef, hasNativeLogProblemRef, finishNatively } = useNativeFinish(
    currentRef,
    fixesRef,
    reportNativeLog,
  );
  const { saved, listSaved, addSaved, deleteSaved } = useSavedRecordings(reportStore);

  useRecorderOpening({
    listSaved,
    hold,
    resetFixWrites,
    hasNativeLogProblemRef,
    reportStore,
    reportNativeLog,
    showOtherTab: problems.showOtherTab,
    setPhase,
  });
  const { lastSaved, isSaving, save, cancel, recordAgain } = useRecordingSave({
    currentRef,
    hasNativeLogProblemRef,
    writeAllFixes,
    failedFixWrites,
    noteFailedWrites,
    addSaved,
    forget,
    reportStore,
    reportNativeLog,
    clearStorageProblem,
    setPhase,
  });

  const isRecording = phase === 'recording';
  const isAwake = useWakeLock(isRecording);
  const { figures, restartClock } = useLiveFigures(current, fixes, isRecording);

  /**
   * Takes the fixes the watch hands over: those after the last one held, stored in one write and
   * counted as one step. The app hands over a whole stretch at once when the page wakes from the
   * screen being off. `until` is a Stop's time: later fixes are not taken.
   */
  function takeFixes(watched: WatchedFix[], until?: number) {
    const recording = currentRef.current;
    // Fixes that land after the ride stopped, before the watch lets go.
    if (!recording || recording.status !== 'recording') return;
    if (isFinishingRef.current && until === undefined) return;
    const taken = takeWatchedFixes(fixesRef.current, watched, until);
    if (taken.length === 0) return;
    writeFixes(recording.id, taken);
    setFixList([...fixesRef.current, ...taken]);
    setLocationProblem(null);
  }

  useGeolocationWatch(isRecording, current?.id ?? null, {
    onFixes: takeFixes,
    onError: (error) => setLocationProblem(locationProblem(error)),
  });

  // In the app a hidden page loses nothing: the foreground service goes on and its fixes are kept.
  useHiddenGaps(isRecording && !keepsRecordingInBackground(), currentRef, keep);

  function start() {
    if (problems.refuseIfOtherTab()) return;
    const startedAt = Date.now();
    setFixList([]);
    restartClock(startedAt);
    clearStorageProblem();
    setLocationProblem(null);
    setAnnouncement('');
    setFocusTarget('heading');
    resetFixWrites(0, 0);
    hasNativeLogProblemRef.current = false;
    keep(newRecording(crypto.randomUUID(), startedAt));
    setPhase('recording');
  }

  /** Stops the recording at `at`, then shows `next`; in the app after the native log is read. */
  function finish(at: number, next: 'paused' | 'form') {
    finishNatively(
      at,
      (logged) => takeFixes(logged, at),
      () => {
        const recording = currentRef.current;
        if (!recording) return;
        keep(stoppedRecording(recording, at, failedFixWrites()));
        setPhase(next);
      },
    );
  }
  const stop = () => finish(Date.now(), 'paused');
  const stopAtLastFix = () => finish(fixes[fixes.length - 1]?.time ?? Date.now(), 'paused');

  function openSave() {
    // Cleared, so the same words are announced again after the next Keep recording.
    setAnnouncement('');
    if (phase === 'recording') finish(Date.now(), 'form');
    else setPhase('form');
  }

  function resume() {
    const recording = currentRef.current;
    if (!recording) return;
    const resumedAt = Date.now();
    const lastFixTime = fixes[fixes.length - 1]?.time ?? null;
    restartClock(resumedAt);
    setLocationProblem(null);
    keep(resumedRecording(recording, resumedAt, lastFixTime, phase === 'unfinished'));
    setPhase('recording');
  }

  function keepRecording() {
    // A save under way has settled the fix writes it waits for; new ones would be dropped.
    if (isSaving()) return;
    resume();
    setFocusTarget('pause');
    setAnnouncement('Recording again');
  }

  function switchMode() {
    const recording = currentRef.current;
    if (!recording) return;
    const switched = switchedMode(recording, Date.now());
    keep(switched.recording);
    setAnnouncement(`Switched to ${MODE_LABEL[switched.to]}`);
  }

  function markPlace() {
    const recording = currentRef.current;
    if (!recording) return;
    const marked = markedRecording(recording, Date.now());
    if (!marked) return;
    keep(marked.recording);
    setAnnouncement(`Flagged, ${marked.count}`);
  }

  return {
    phase,
    current,
    fixes,
    kept,
    figures,
    mode: currentMode(current?.modes ?? []),
    lastSaved,
    saved,
    isAwake,
    problem: problems.problem,
    announcement,
    start,
    stop,
    stopAtLastFix,
    resume,
    switchMode,
    markPlace,
    openSave,
    keepRecording,
    focusTarget,
    save,
    cancel,
    recordAgain,
    deleteSaved,
  };
}

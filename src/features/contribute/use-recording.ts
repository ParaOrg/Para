import { useCallback, useEffect, useRef, useState } from 'react';

import { locationProblem } from './location-problem';
import { clearNativeFixes, keepsRecordingInBackground } from './native-fixes';
import { openRecorder } from './recorder-opening';
import { downloadHeldRecording, downloadStoredRecording } from './recording-downloads';
import { fixOfRow, takeWatchedFixes } from './recording-fixes';
import { withMark } from './recording-marks';
import { WAY_LABEL, currentWay } from './recording-rules';
import type { Recording } from './recording-schema';
import type { Phase, RecordingDetails, RecordingState } from './recording-state';
import { deleteRecording, putRecording } from './recording-store';
import {
  newRecording,
  resumedRecording,
  savedRecording,
  stoppedRecording,
  switchedWay,
} from './recording-transitions';
import { useFixWrites } from './use-fix-writes';
import { useGeolocationWatch, type WatchedFix } from './use-geolocation-watch';
import { useHiddenGaps } from './use-hidden-gaps';
import { useLiveFigures } from './use-live-figures';
import { useNativeFinish } from './use-native-finish';
import { useRecordingInHand } from './use-recording-in-hand';
import { useSavedRecordings } from './use-saved-recordings';
import { useWakeLock } from './use-wake-lock';

const STORE_PROBLEM =
  'This phone could not keep the recording. Close other tabs of this page and try again.';
const OTHER_TAB_PROBLEM =
  'Para is open in another tab. Record in that tab, or close it and reload this one.';

/**
 * The page's whole state: what phase it is in, the recording being made and
 * its fixes. Every fix goes to IndexedDB as it arrives; the hook only reads
 * it back on reopen. A saved recording stays in IndexedDB until the
 * contributor deletes it, uploaded or not (use-uploads.ts sends it).
 */
export function useRecording(): RecordingState {
  const [phase, setPhase] = useState<Phase>('loading');
  const [lastSaved, setLastSaved] = useState<Recording | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [focusTarget, setFocusTarget] = useState<'heading' | 'stop'>('heading');
  // Two slots, so a location error never hides a storage failure: storage stays
  // until a new recording starts, location clears when the next fix arrives.
  const [storageProblem, setStorageProblem] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const isSaving = useRef(false);
  // Another tab holds the recorder: this one shows why and starts nothing.
  const isOtherTab = useRef(false);

  const reportStore = useCallback((error: unknown) => {
    console.error('IndexedDB failed.', error);
    setStorageProblem(STORE_PROBLEM);
  }, []);

  // A native log that cannot be read leaves the ride with the fixes the page already holds.
  const reportNativeLog = useCallback((error: unknown) => {
    console.error('The fixes kept by the app could not be imported.', error);
  }, []);

  const { current, fixes, kept, currentRef, fixesRef, keep, hold, setFixList, forget } =
    useRecordingInHand(reportStore);

  /**
   * Puts a fix write that failed after the Stop on the stopped recording too, so the
   * form counts it and offers the download that still holds it.
   */
  const noteFailedWrites = useCallback(
    (failedCount: number) => {
      const recording = currentRef.current;
      if (!recording || recording.status === 'recording') return;
      if (recording.failedFixWrites === failedCount) return;
      keep({ ...recording, failedFixWrites: failedCount });
    },
    [currentRef, keep],
  );

  const { writeFixes, writeAllFixes, failedFixWrites, resetFixWrites } = useFixWrites(
    (error, failedCount) => {
      reportStore(error);
      noteFailedWrites(failedCount);
    },
  );
  const { isFinishingRef, hasNativeLogProblemRef, finishNatively } = useNativeFinish(
    currentRef,
    fixesRef,
    reportNativeLog,
  );
  const { saved, listSaved, addSaved, deleteSaved } = useSavedRecordings(reportStore);

  useEffect(() => {
    let isCancelled = false;
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
          isOtherTab.current = true;
          setStorageProblem(OTHER_TAB_PROBLEM);
          setPhase('ready');
        } else if (opening.kind === 'open') {
          const { recording, rows } = opening;
          hold(recording, rows.map(fixOfRow));
          const nextSeq = rows.length > 0 ? rows[rows.length - 1].seq + 1 : 0;
          resetFixWrites(nextSeq, recording.failedFixWrites ?? 0);
          setPhase(recording.status === 'stopped' ? 'paused' : 'unfinished');
        } else {
          setPhase('ready');
        }
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        reportStore(error);
        setPhase('ready');
      });
    return () => {
      isCancelled = true;
    };
  }, [reportStore, reportNativeLog, listSaved, hold, hasNativeLogProblemRef, resetFixWrites]);

  const isRecording = phase === 'recording';
  const isAwake = useWakeLock(isRecording);
  const { figures, restartClock } = useLiveFigures(current, fixes, isRecording);

  /**
   * Takes the fixes the watch hands over: those after the last one held, stored in one write and
   * counted as one step. The app hands over a whole stretch at once when the page wakes from the
   * screen being off; a ride that came back to its start inside it stops at that fix, and the
   * ones after it are left out. `until` is a Stop's time: later fixes are not taken, and the
   * ride is not checked for coming back to its start.
   */
  function takeFixes(watched: WatchedFix[], until?: number) {
    const recording = currentRef.current;
    // Fixes that land after the ride stopped itself, before the watch lets go.
    if (!recording || recording.status !== 'recording') return;
    if (isFinishingRef.current && until === undefined) return;
    const { taken, isBackAtStart } = takeWatchedFixes(fixesRef.current, watched, recording, until);
    if (taken.length === 0) return;
    writeFixes(recording.id, taken);
    setFixList([...fixesRef.current, ...taken]);
    setLocationError(null);
    if (isBackAtStart) {
      setAnnouncement('Back at the start. The recording stopped.');
      finish(taken[taken.length - 1].time, 'form', { hasAutoStopped: true });
    }
  }

  useGeolocationWatch(isRecording, current?.id ?? null, {
    onFixes: takeFixes,
    onError: (error) => setLocationError(locationProblem(error)),
  });

  // In the app a hidden page loses nothing: the foreground service goes on and its fixes are kept.
  useHiddenGaps(isRecording && !keepsRecordingInBackground(), currentRef, keep);

  function start() {
    if (isOtherTab.current) {
      setStorageProblem(OTHER_TAB_PROBLEM);
      return;
    }
    const startedAt = Date.now();
    setFixList([]);
    restartClock(startedAt);
    setStorageProblem(null);
    setLocationError(null);
    setAnnouncement('');
    setFocusTarget('heading');
    resetFixWrites(0, 0);
    hasNativeLogProblemRef.current = false;
    keep(newRecording(crypto.randomUUID(), startedAt));
    setPhase('recording');
  }

  /** Stops the recording at `at`, then shows `next`; in the app after the native log is read. */
  function finish(at: number, next: 'paused' | 'form', extra?: Pick<Recording, 'hasAutoStopped'>) {
    finishNatively(
      at,
      (logged) => takeFixes(logged, at),
      () => {
        const recording = currentRef.current;
        if (!recording) return;
        keep(stoppedRecording(recording, at, failedFixWrites(), extra));
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
    setLocationError(null);
    keep(resumedRecording(recording, resumedAt, lastFixTime, phase === 'unfinished'));
    setPhase('recording');
  }

  function keepRecording() {
    // A save under way has settled the fix writes it waits for; new ones would be dropped.
    if (isSaving.current) return;
    resume();
    setFocusTarget('stop');
    setAnnouncement('Recording again');
  }

  function switchWay() {
    const recording = currentRef.current;
    if (!recording) return;
    const switched = switchedWay(recording, Date.now());
    keep(switched.recording);
    setAnnouncement(`Switched to ${WAY_LABEL[switched.to]}`);
  }

  function markPlace() {
    const recording = currentRef.current;
    if (!recording || recording.status !== 'recording') return;
    const marks = recording.marks ?? [];
    const next = withMark(marks, Date.now());
    if (next === marks) return;
    keep({ ...recording, marks: next });
    setAnnouncement(`Marked, ${next.length}`);
  }

  async function flushFixes() {
    try {
      await writeAllFixes();
    } catch (error) {
      reportStore(error);
    }
  }

  /**
   * Saves only once the phone holds the whole ride: the fix writes in flight are settled,
   * failed ones written again, then the recording. Until that commits, the ride stays in
   * hand on the form, where Continue tries again and the download still has every fix.
   */
  async function saveNow(details: RecordingDetails | null) {
    const recording = currentRef.current;
    if (!recording || isSaving.current) return;
    isSaving.current = true;
    try {
      await writeAllFixes();
      const kept = savedRecording(recording, details, Date.now(), failedFixWrites());
      await putRecording(kept);
      setStorageProblem(null);
      setLastSaved(kept);
      addSaved(kept);
      forget();
      if (!hasNativeLogProblemRef.current) void clearNativeFixes().catch(reportNativeLog);
      setPhase('saved');
    } catch (error) {
      reportStore(error);
      noteFailedWrites(failedFixWrites());
    } finally {
      isSaving.current = false;
    }
  }
  const save = (details: RecordingDetails | null) => void saveNow(details);

  function cancel() {
    if (isSaving.current) return;
    const recording = currentRef.current;
    if (recording) deleteRecording(recording.id).catch(reportStore);
    forget();
    void clearNativeFixes().catch(reportNativeLog);
    hasNativeLogProblemRef.current = false;
    setStorageProblem(null);
    setPhase('ready');
  }

  function recordAgain() {
    setLastSaved(null);
    setPhase('ready');
  }

  function downloadCurrent() {
    if (current) downloadHeldRecording(current, fixes);
  }

  function downloadSaved(recording: Recording) {
    downloadStoredRecording(recording).catch(reportStore);
  }

  function downloadLastSaved() {
    if (lastSaved) downloadSaved(lastSaved);
  }

  return {
    phase,
    current,
    fixes,
    kept,
    figures,
    way: currentWay(current?.switches ?? []),
    lastSaved,
    saved,
    isAwake,
    problem: storageProblem ?? locationError,
    announcement,
    start,
    stop,
    stopAtLastFix,
    resume,
    switchWay,
    markPlace,
    openSave,
    keepRecording,
    focusTarget,
    save,
    cancel,
    flushFixes,
    recordAgain,
    downloadCurrent,
    downloadLastSaved,
    downloadSaved,
    deleteSaved,
  };
}

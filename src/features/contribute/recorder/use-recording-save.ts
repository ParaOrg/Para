import { useRef, useState, type RefObject } from 'react';

import { clearNativeFixes } from './native-fixes';
import type { Phase, RecordingDetails } from './recording-state';
import { savedRecording } from './recording-transitions';
import type { Recording } from '../storage/recording-schema';
import { deleteRecording, putRecording } from '../storage/recording-store';

interface RecordingSaveOptions {
  currentRef: RefObject<Recording | null>;
  hasNativeLogProblemRef: RefObject<boolean>;
  writeAllFixes: () => Promise<void>;
  failedFixWrites: () => number;
  noteFailedWrites: (failedCount: number) => void;
  addSaved: (recording: Recording) => void;
  forget: () => void;
  reportStore: (error: unknown) => void;
  reportNativeLog: (error: unknown) => void;
  clearStorageProblem: () => void;
  setPhase: (phase: Phase) => void;
}

export interface RecordingSave {
  /** The recording just saved, until the contributor records again. */
  lastSaved: Recording | null;
  /** Whether a save is under way: its fix writes are settled, so no new ones may start. */
  isSaving: () => boolean;
  save: (details: RecordingDetails | null) => void;
  cancel: () => void;
  recordAgain: () => void;
}

/** How a recording in hand ends: saved on the phone, or thrown away. */
export function useRecordingSave({
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
}: RecordingSaveOptions): RecordingSave {
  const [lastSaved, setLastSaved] = useState<Recording | null>(null);
  const isSaving = useRef(false);

  /**
   * Saves only once the phone holds the whole ride: the fix writes in flight are settled,
   * failed ones written again, then the recording. Until that commits, the ride stays in
   * hand on the form, where Continue tries again with every fix still in memory.
   */
  async function saveNow(details: RecordingDetails | null) {
    const recording = currentRef.current;
    if (!recording || isSaving.current) return;
    isSaving.current = true;
    try {
      await writeAllFixes();
      const kept = savedRecording(recording, details, Date.now(), failedFixWrites());
      await putRecording(kept);
      clearStorageProblem();
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

  function cancel() {
    if (isSaving.current) return;
    const recording = currentRef.current;
    if (recording) deleteRecording(recording.id).catch(reportStore);
    forget();
    void clearNativeFixes().catch(reportNativeLog);
    hasNativeLogProblemRef.current = false;
    clearStorageProblem();
    setPhase('ready');
  }

  function recordAgain() {
    setLastSaved(null);
    setPhase('ready');
  }

  return {
    lastSaved,
    isSaving: () => isSaving.current,
    save: (details) => void saveNow(details),
    cancel,
    recordAgain,
  };
}

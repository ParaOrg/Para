import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  keptFixes,
  summarize,
  type Fix,
  type GapReason,
} from '@/features/routes/model/ride-recording';

import { CONSENT_VERSION } from './consent-version';
import { locationProblem } from './location-problem';
import {
  clearNativeFixes,
  endNativeFixes,
  importNativeFixes,
  keepsRecordingInBackground,
  readNativeFixes,
} from './native-fixes';
import { holdRecorderLock } from './recorder-lock';
import { downloadRecording, recordingFile } from './recording-file';
import { backAtStartCount, fixesAfter, fixOfRow, fixOfWatched, rowOfFix } from './recording-fixes';
import { withMark } from './recording-marks';
import { OTHER_WAY, WAY_LABEL, currentWay, type Way } from './recording-rules';
import { RECORDING_VERSION, type FixRow, type Recording, type RideKind } from './recording-schema';
import {
  deleteRecording,
  loadFixes,
  loadRecordings,
  putFixes,
  putRecording,
} from './recording-store';
import { useGeolocationWatch, type WatchedFix } from './use-geolocation-watch';
import { useHiddenGaps } from './use-hidden-gaps';
import { useWakeLock } from './use-wake-lock';

/**
 * Where the page is. Recording and paused are one screen (Stop pauses, Resume
 * carries on); form is the Save form, however it was reached; saved is the
 * thank-you.
 */
export type Phase = 'loading' | 'ready' | 'unfinished' | 'recording' | 'paused' | 'form' | 'saved';

/** What the contributor may say about a ride when they save it; all of it optional. */
export interface RecordingDetails {
  startPointName: string;
  endPointName: string;
  description: string;
  rideKind: RideKind | null;
}

/** What the stats strip shows. */
export interface RecordingFigures {
  elapsedSeconds: number;
  distanceM: number;
}

export interface RecordingState {
  phase: Phase;
  /** The recording being made, or stopped and not yet saved; null on Ready. */
  current: Recording | null;
  /** Every fix the phone reported for it, in order. */
  fixes: readonly Fix[];
  /** The fixes that count, worked out once per fix. */
  kept: readonly Fix[];
  /** Time recorded (pauses left out) and distance so far; null on Ready. */
  figures: RecordingFigures | null;
  /** The way the ride is on now: outbound is papunta, return is pabalik. */
  way: Way;
  /** The recording just saved, until the contributor records again. */
  lastSaved: Recording | null;
  /** Every recording saved on this phone, newest first. */
  saved: readonly Recording[];
  /** Whether the screen is being kept awake. */
  isAwake: boolean;
  /** Something the contributor should know went wrong, in words. */
  problem: string | null;
  /** What a screen reader hears once: a switch of way, or the ride stopping itself. */
  announcement: string;
  start: () => void;
  /** Pauses the recording; Resume carries on. */
  stop: () => void;
  /** Stops a recording found open after a reload where its last fix left it, as Stop does: paused, with Save and Resume. */
  stopAtLastFix: () => void;
  resume: () => void;
  switchWay: () => void;
  /** Marks the place the ride is at: the time of the tap, nothing more. */
  markPlace: () => void;
  /** Stops a running recording, then opens the Save form. */
  openSave: () => void;
  /** From the Save form, back to recording as Resume does: the time on the form is a gap. */
  keepRecording: () => void;
  /** Where focus goes as the recording screen opens: its heading, or the Stop bar after Keep recording. */
  focusTarget: 'heading' | 'stop';
  /** Saves the recording; with no details, as it is. */
  save: (details: RecordingDetails | null) => void;
  cancel: () => void;
  /** Settles the fix writes in flight and writes again the ones that failed, as far as the phone allows. */
  flushFixes: () => Promise<void>;
  /** Back to Ready after a save. */
  recordAgain: () => void;
  /** Downloads the recording in hand from memory, for when the phone could not keep its fixes. */
  downloadCurrent: () => void;
  /** Field test only: the file of the recording just saved. Goes at contribute/13. */
  downloadLastSaved: () => void;
  /** Downloads a saved recording, read back from this phone. */
  downloadSaved: (recording: Recording) => void;
  /** Deletes a saved recording and its fixes from this phone. An uploaded copy is not touched. */
  deleteSaved: (recording: Recording) => void;
}

const STORE_PROBLEM =
  'This phone could not keep the recording. Close other tabs of this page and try again.';
/** Tells this phone's other tabs a recording was saved, so their lists catch up. */
const SAVED_CHANNEL = 'parapo-saved-recordings';

function tellOtherTabs() {
  if (typeof BroadcastChannel === 'undefined') return;
  const channel = new BroadcastChannel(SAVED_CHANNEL);
  channel.postMessage('saved');
  channel.close();
}

const OTHER_TAB_PROBLEM =
  'ParaPo is open in another tab. Record in that tab, or close it and reload this one.';

/**
 * The page's whole state: what phase it is in, the recording being made and
 * its fixes. Every fix goes to IndexedDB as it arrives; the hook only reads
 * it back on reopen. A saved recording stays in IndexedDB until the
 * contributor deletes it, uploaded or not (use-uploads.ts sends it).
 */
export function useRecording(): RecordingState {
  const [phase, setPhase] = useState<Phase>('loading');
  const [lastSaved, setLastSaved] = useState<Recording | null>(null);
  const [saved, setSaved] = useState<Recording[]>([]);
  const [current, setCurrent] = useState<Recording | null>(null);
  // The fixes and the ones that count, set together: the rules run once per fix, not once per render.
  const [{ fixes, kept }, setTrack] = useState<{ fixes: Fix[]; kept: Fix[] }>({
    fixes: [],
    kept: [],
  });
  const [now, setNow] = useState(() => Date.now());
  const [announcement, setAnnouncement] = useState('');
  const [focusTarget, setFocusTarget] = useState<'heading' | 'stop'>('heading');
  // Two slots, so a location error never hides a storage failure: storage stays
  // until a new recording starts, location clears when the next fix arrives.
  const [storageProblem, setStorageProblem] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  // The recording and its fixes as the handlers below read them, kept beside
  // the state because they write it without waiting for a render.
  const currentRef = useRef<Recording | null>(null);
  const fixesRef = useRef<Fix[]>([]);
  const nextSeq = useRef(0);
  const failedFixWrites = useRef(0);
  // Fix writes still in flight, and the rows whose own write failed: Save settles the
  // first and writes the second again, so a late failure cannot drop a fix unnoticed.
  const pendingFixWrites = useRef(new Set<Promise<void>>());
  const unwrittenFixes = useRef<FixRow[]>([]);
  const isSaving = useRef(false);
  // The native log could not be read or imported: it is kept, not cleared, when the ride is saved.
  const hasNativeLogProblem = useRef(false);
  // A Stop is waiting for the native log; fixes after it are not part of the ride.
  const isFinishing = useRef(false);
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

  /** Makes this the recording in hand and writes it to the phone. */
  const keep = useCallback(
    (recording: Recording) => {
      currentRef.current = recording;
      setCurrent(recording);
      putRecording(recording).catch(reportStore);
    },
    [reportStore],
  );

  /**
   * Puts a fix write that failed after the Stop on the stopped recording too, so the
   * form counts it and offers the download that still holds it.
   */
  const noteFailedWrites = useCallback(() => {
    const recording = currentRef.current;
    if (!recording || recording.status === 'recording') return;
    if (recording.failedFixWrites === failedFixWrites.current) return;
    keep({ ...recording, failedFixWrites: failedFixWrites.current });
  }, [keep]);

  /** Makes this the list of fixes, and returns the ones that count. */
  function setFixList(list: Fix[]): Fix[] {
    const counted = keptFixes(list);
    fixesRef.current = list;
    setTrack({ fixes: list, kept: counted });
    return counted;
  }

  function forgetCurrent() {
    currentRef.current = null;
    setCurrent(null);
    setFixList([]);
  }

  useEffect(() => {
    let isCancelled = false;
    const load = async () => {
      try {
        const isOurs = await holdRecorderLock();
        const all = await loadRecordings();
        if (isCancelled) return;
        setSaved(all.filter((r) => r.status === 'saved'));
        if (!isOurs) {
          isOtherTab.current = true;
          setStorageProblem(OTHER_TAB_PROBLEM);
          setPhase('ready');
          return;
        }
        let open = all.find((r) => r.status !== 'saved') ?? null;
        if (open) {
          try {
            const imported = await importNativeFixes(open);
            if (imported !== open) await putRecording(imported);
            open = imported;
          } catch (error) {
            // The log stays on the phone, so a Save does not clear fixes that were never stored.
            hasNativeLogProblem.current = true;
            reportNativeLog(error);
          }
        }
        const rows = open ? await loadFixes(open.id) : [];
        if (isCancelled) return;
        if (open) {
          currentRef.current = open;
          setCurrent(open);
          setFixList(rows.map(fixOfRow));
          nextSeq.current = rows.length > 0 ? rows[rows.length - 1].seq + 1 : 0;
          failedFixWrites.current = open.failedFixWrites ?? 0;
          setPhase(open.status === 'stopped' ? 'paused' : 'unfinished');
        } else {
          setPhase('ready');
        }
      } catch (error) {
        if (isCancelled) return;
        reportStore(error);
        setPhase('ready');
      }
    };
    void load();
    return () => {
      isCancelled = true;
    };
  }, [reportStore, reportNativeLog]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const channel = new BroadcastChannel(SAVED_CHANNEL);
    channel.onmessage = () => {
      loadRecordings()
        .then((all) => setSaved(all.filter((r) => r.status === 'saved')))
        .catch(reportStore);
    };
    return () => channel.close();
  }, [reportStore]);

  const isRecording = phase === 'recording';
  const isAwake = useWakeLock(isRecording);

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
    if (isFinishing.current && until === undefined) return;
    const lastTime = fixesRef.current[fixesRef.current.length - 1]?.time ?? null;
    const fresh = fixesAfter(watched, lastTime)
      .filter((fix) => until === undefined || fix.timestamp <= until)
      .map(fixOfWatched);
    if (fresh.length === 0) return;
    const stopCount =
      recording.hasAutoStopped || until !== undefined
        ? null
        : backAtStartCount(fixesRef.current, fresh, recording.switches ?? []);
    const taken = fresh.slice(0, stopCount ?? fresh.length);
    const rows = taken.map((fix) => rowOfFix(recording.id, nextSeq.current++, fix));
    const write = putFixes(rows)
      .catch((error: unknown) => {
        failedFixWrites.current += rows.length;
        unwrittenFixes.current.push(...rows);
        reportStore(error);
        noteFailedWrites();
      })
      .finally(() => pendingFixWrites.current.delete(write));
    pendingFixWrites.current.add(write);
    setFixList([...fixesRef.current, ...taken]);
    setLocationError(null);
    if (stopCount !== null) {
      setAnnouncement('Back at the start. The recording stopped.');
      finish(taken[taken.length - 1].time, 'form', { hasAutoStopped: true });
    }
  }

  useGeolocationWatch(isRecording, current?.id ?? null, {
    onFixes: takeFixes,
    onError: (error) => setLocationError(locationProblem(error)),
  });

  // The clock the live totals and the open silence run on.
  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  // In the app a hidden page loses nothing: the foreground service goes on and its fixes are kept.
  useHiddenGaps(isRecording && !keepsRecordingInBackground(), currentRef, keep);

  function start() {
    if (isOtherTab.current) {
      setStorageProblem(OTHER_TAB_PROBLEM);
      return;
    }
    const startedAt = Date.now();
    nextSeq.current = 0;
    setFixList([]);
    setNow(startedAt);
    setStorageProblem(null);
    setLocationError(null);
    setAnnouncement('');
    setFocusTarget('heading');
    failedFixWrites.current = 0;
    unwrittenFixes.current = [];
    hasNativeLogProblem.current = false;
    keep({
      version: RECORDING_VERSION,
      id: crypto.randomUUID(),
      status: 'recording',
      startedAt,
      stoppedAt: null,
      savedAt: null,
      gaps: [],
      switches: [],
      marks: [],
      startPointName: '',
      endPointName: '',
      description: '',
      rideKind: null,
      consentVersion: CONSENT_VERSION,
    });
    setPhase('recording');
  }

  /**
   * Stops the recording at `at`. In the app the fixes the service kept up to then are taken first,
   * so a Stop right after the screen was off loses none, and the native log is ended after: it
   * takes no fixes past the Stop until Resume.
   */
  function finish(at: number, next: 'paused' | 'form', extra?: Pick<Recording, 'hasAutoStopped'>) {
    if (!keepsRecordingInBackground()) {
      settle(at, next, extra);
      return;
    }
    if (isFinishing.current) return;
    isFinishing.current = true;
    const id = currentRef.current?.id;
    const pull = id ? readNativeFixes(id).then((kept) => takeFixes(kept, at)) : Promise.resolve();
    pull
      .catch((error: unknown) => {
        hasNativeLogProblem.current = true;
        reportNativeLog(error);
      })
      .finally(() => {
        isFinishing.current = false;
        settle(at, next, extra);
        endNativeFixes(at).catch(reportNativeLog);
      });
  }

  function settle(at: number, next: 'paused' | 'form', extra?: Pick<Recording, 'hasAutoStopped'>) {
    const recording = currentRef.current;
    if (!recording) return;
    const failed = failedFixWrites.current;
    keep({
      ...recording,
      ...extra,
      status: 'stopped',
      stoppedAt: at,
      ...(failed > 0 && { failedFixWrites: failed }),
    });
    setPhase(next);
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
    const missed = (from: number, reason: GapReason): Recording['gaps'] => [
      { from, to: resumedAt, reasons: [reason] },
    ];
    // A recording found open after a reload lost the time since its last fix;
    // one stopped on purpose was paused from the Stop.
    let lost: Recording['gaps'] = [];
    if (phase === 'unfinished') {
      lost = missed(fixes[fixes.length - 1]?.time ?? recording.startedAt, 'resumed');
    } else if (recording.stoppedAt !== null) {
      lost = missed(recording.stoppedAt, 'paused');
    }
    setNow(resumedAt);
    setLocationError(null);
    keep({
      ...recording,
      status: 'recording',
      stoppedAt: null,
      gaps: [...recording.gaps, ...lost],
    });
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
    const switches = recording.switches ?? [];
    const to = OTHER_WAY[currentWay(switches)];
    keep({ ...recording, switches: [...switches, { time: Date.now(), to }] });
    setAnnouncement(`Switched to ${WAY_LABEL[to]}`);
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
      await Promise.allSettled([...pendingFixWrites.current]);
      const unwritten = unwrittenFixes.current;
      if (unwritten.length === 0) return;
      await putFixes(unwritten);
      failedFixWrites.current = Math.max(0, failedFixWrites.current - unwritten.length);
      unwrittenFixes.current = [];
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
      await Promise.allSettled([...pendingFixWrites.current]);
      const unwritten = unwrittenFixes.current;
      if (unwritten.length > 0) {
        await putFixes(unwritten);
        failedFixWrites.current = Math.max(0, failedFixWrites.current - unwritten.length);
        unwrittenFixes.current = [];
      }
      const kept: Recording = { ...recording, ...details, status: 'saved', savedAt: Date.now() };
      delete kept.failedFixWrites;
      if (failedFixWrites.current > 0) kept.failedFixWrites = failedFixWrites.current;
      await putRecording(kept);
      setStorageProblem(null);
      setLastSaved(kept);
      setSaved((list) => [kept, ...list.filter((r) => r.id !== kept.id)]);
      tellOtherTabs();
      forgetCurrent();
      if (!hasNativeLogProblem.current) void clearNativeFixes().catch(reportNativeLog);
      setPhase('saved');
    } catch (error) {
      reportStore(error);
      noteFailedWrites();
    } finally {
      isSaving.current = false;
    }
  }
  const save = (details: RecordingDetails | null) => void saveNow(details);

  function cancel() {
    if (isSaving.current) return;
    const recording = currentRef.current;
    if (recording) deleteRecording(recording.id).catch(reportStore);
    forgetCurrent();
    void clearNativeFixes().catch(reportNativeLog);
    hasNativeLogProblem.current = false;
    setStorageProblem(null);
    setPhase('ready');
  }

  function recordAgain() {
    setLastSaved(null);
    setPhase('ready');
  }

  function downloadCurrent() {
    if (!current) return;
    const end = current.stoppedAt ?? Date.now();
    const summary = summarize(fixes, current.gaps, current.startedAt, end);
    downloadRecording(recordingFile(current, fixes, summary));
  }

  function downloadSaved(recording: Recording) {
    loadFixes(recording.id)
      .then((rows) => {
        const recorded = rows.map(fixOfRow);
        const end = recording.stoppedAt ?? recording.savedAt ?? recording.startedAt;
        const summary = summarize(recorded, recording.gaps, recording.startedAt, end);
        downloadRecording(recordingFile(recording, recorded, summary));
      })
      .catch(reportStore);
  }

  function deleteSaved(recording: Recording) {
    deleteRecording(recording.id)
      .then(() => {
        setSaved((list) => list.filter((r) => r.id !== recording.id));
        tellOtherTabs();
      })
      .catch(reportStore);
  }

  function downloadLastSaved() {
    if (lastSaved) downloadSaved(lastSaved);
  }

  // The totals come from the fixes alone (the fix-time `end`), so the 1 Hz clock only
  // adds the time since the last fix instead of running the rules again.
  const lastFixTime = fixes[fixes.length - 1]?.time ?? null;
  const summary = useMemo(() => {
    if (!current) return null;
    // A running recording is summarised to its last fix, or to the end of the latest pause when
    // that is later, so a Resume counts the pause as paused before the first new fix comes.
    const lastGapEnd = Math.max(0, ...current.gaps.map((g) => g.to));
    const end = isRecording
      ? Math.max(lastFixTime ?? current.startedAt, lastGapEnd)
      : (current.stoppedAt ?? now);
    return summarize(fixes, current.gaps, current.startedAt, end);
    // `now` only ends a recording that is neither running nor stopped, which has no clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [fixes, current, isRecording, lastFixTime]);
  const end = isRecording ? now : (current?.stoppedAt ?? now);
  const figures =
    current && summary
      ? {
          elapsedSeconds: Math.max(0, (end - current.startedAt) / 1000 - summary.pausedSeconds),
          distanceM: summary.distanceM,
        }
      : null;
  const problem = storageProblem ?? locationError;

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
    problem,
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

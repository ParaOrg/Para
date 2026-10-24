import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  keptFixes,
  summarize,
  type Fix,
  type GapReason,
} from '@/features/routes/model/ride-recording';

import { CONSENT_VERSION } from './consent-version';
import { locationProblem } from './location-problem';
import { holdRecorderLock } from './recorder-lock';
import { downloadRecording, recordingFile } from './recording-file';
import { OTHER_WAY, WAY_LABEL, currentWay, shouldAutoStop, type Way } from './recording-rules';
import { RECORDING_VERSION, type FixRow, type Recording, type RideKind } from './recording-schema';
import {
  deleteRecording,
  loadFixes,
  loadRecordings,
  putFix,
  putFixes,
  putRecording,
} from './recording-store';
import { useGeolocationWatch } from './use-geolocation-watch';
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
  /** Stops a running recording, then opens the Save form. */
  openSave: () => void;
  /** From the Save form, back to recording as Resume does: the time on the form is a gap. */
  keepRecording: () => void;
  /** Where focus goes as the recording screen opens: its heading, or the Stop bar after Keep recording. */
  focusTarget: 'heading' | 'stop';
  /** Saves the recording; with no details, as it is. */
  save: (details: RecordingDetails | null) => void;
  cancel: () => void;
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

const toFix = (row: FixRow): Fix => ({
  time: row.time,
  at: [row.lng, row.lat],
  accuracyM: row.accuracyM,
});

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
  // Another tab holds the recorder: this one shows why and starts nothing.
  const isOtherTab = useRef(false);

  const reportStore = useCallback((error: unknown) => {
    console.error('IndexedDB failed.', error);
    setStorageProblem(STORE_PROBLEM);
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
        const open = all.find((r) => r.status !== 'saved') ?? null;
        const rows = open ? await loadFixes(open.id) : [];
        if (isCancelled) return;
        if (open) {
          currentRef.current = open;
          setCurrent(open);
          setFixList(rows.map(toFix));
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
  }, [reportStore]);

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

  useGeolocationWatch(isRecording, {
    onFix: (position) => {
      const recording = currentRef.current;
      // A fix that lands after the ride stopped itself, before the watch lets go.
      if (!recording || recording.status !== 'recording') return;
      const row: FixRow = {
        recordingId: recording.id,
        seq: nextSeq.current++,
        time: position.timestamp,
        lng: position.coords.longitude,
        lat: position.coords.latitude,
        accuracyM: position.coords.accuracy,
      };
      const write = putFix(row)
        .catch((error: unknown) => {
          failedFixWrites.current += 1;
          unwrittenFixes.current.push(row);
          reportStore(error);
          noteFailedWrites();
        })
        .finally(() => pendingFixWrites.current.delete(write));
      pendingFixWrites.current.add(write);
      const counted = setFixList([...fixesRef.current, toFix(row)]);
      setLocationError(null);
      if (isBackAtStart(counted)) {
        setAnnouncement('Back at the start. The recording stopped.');
        finish(position.timestamp, 'form', { hasAutoStopped: true });
      }
    },
    onError: (error) => setLocationError(locationProblem(error)),
  });

  /**
   * Whether the ride has gone out, turned back and come home. The rule is pure
   * and stays true once it has fired, so a recording that stopped itself is
   * marked and never asked again: a Resume must not stop it a second time.
   */
  function isBackAtStart(counted: readonly Fix[]): boolean {
    const recording = currentRef.current;
    if (!recording || recording.hasAutoStopped) return false;
    return shouldAutoStop(counted, recording.switches ?? []);
  }

  // The clock the live totals and the open silence run on.
  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  useHiddenGaps(isRecording, currentRef, keep);

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
    keep({
      version: RECORDING_VERSION,
      id: crypto.randomUUID(),
      status: 'recording',
      startedAt,
      stoppedAt: null,
      savedAt: null,
      gaps: [],
      switches: [],
      startPointName: '',
      endPointName: '',
      description: '',
      rideKind: null,
      consentVersion: CONSENT_VERSION,
    });
    setPhase('recording');
  }

  function finish(at: number, next: 'paused' | 'form', extra?: Pick<Recording, 'hasAutoStopped'>) {
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
        const recorded = rows.map(toFix);
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
    openSave,
    keepRecording,
    focusTarget,
    save,
    cancel,
    recordAgain,
    downloadCurrent,
    downloadLastSaved,
    downloadSaved,
    deleteSaved,
  };
}

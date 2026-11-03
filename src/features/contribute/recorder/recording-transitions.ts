import type { GapReason } from '@/features/routes/model/ride-recording';

import { OTHER_MODE, currentMode, type Mode } from './recording-rules';
import type { Phase, RecordingDetails } from './recording-state';
import { CONSENT_VERSION } from '../consent/consent-version';
import { RECORDING_VERSION, type FixRow, type Recording } from '../storage/recording-schema';

/** A recording that starts now, on walk, with nothing in it yet. */
export function newRecording(id: string, startedAt: number): Recording {
  return {
    version: RECORDING_VERSION,
    id,
    status: 'recording',
    startedAt,
    stoppedAt: null,
    savedAt: null,
    gaps: [],
    modes: [{ time: startedAt, to: 'walk' }],
    marks: [],
    startPointName: '',
    endPointName: '',
    description: '',
    rideKind: null,
    consentVersion: CONSENT_VERSION,
  };
}

/** The recording stopped at `at`, carrying the fix writes the phone could not keep. */
export function stoppedRecording(
  recording: Recording,
  at: number,
  failedFixWrites: number,
): Recording {
  return {
    ...recording,
    status: 'stopped',
    stoppedAt: at,
    ...(failedFixWrites > 0 && { failedFixWrites }),
  };
}

/**
 * The recording running again from `resumedAt`. One found open after a reload (`isUnfinished`)
 * lost the time since its last fix; one stopped on purpose was paused from the Stop.
 */
export function resumedRecording(
  recording: Recording,
  resumedAt: number,
  lastFixTime: number | null,
  isUnfinished: boolean,
): Recording {
  const missed = (from: number, reason: GapReason): Recording['gaps'] => [
    { from, to: resumedAt, reasons: [reason] },
  ];
  let lost: Recording['gaps'] = [];
  if (isUnfinished) {
    lost = missed(lastFixTime ?? recording.startedAt, 'resumed');
  } else if (recording.stoppedAt !== null) {
    lost = missed(recording.stoppedAt, 'paused');
  }
  return { ...recording, status: 'recording', stoppedAt: null, gaps: [...recording.gaps, ...lost] };
}

/** A recording after a switch of mode, and the mode it is on now. */
export interface SwitchedMode {
  recording: Recording;
  to: Mode;
}

/** The recording switched to the other mode at `time`, and the mode it is on now. */
export function switchedMode(recording: Recording, time: number): SwitchedMode {
  const to = OTHER_MODE[currentMode(recording.modes)];
  return { recording: { ...recording, modes: [...recording.modes, { time, to }] }, to };
}

/** The recording as saved, with the details given and the fix writes still missing. */
export function savedRecording(
  recording: Recording,
  details: RecordingDetails | null,
  savedAt: number,
  failedFixWrites: number,
): Recording {
  const kept: Recording = { ...recording, ...details, status: 'saved', savedAt };
  delete kept.failedFixWrites;
  if (failedFixWrites > 0) kept.failedFixWrites = failedFixWrites;
  return kept;
}

/** Where a recording found open as the page opens carries on. */
export interface ReopenPoint {
  /** The row its next fix is written at. */
  nextSeq: number;
  /** The fix writes the phone had not kept before the reload. */
  failedFixWrites: number;
  /** Stopped on purpose: paused, with Save and Resume. Otherwise it was cut off mid-ride. */
  phase: Extract<Phase, 'paused' | 'unfinished'>;
}

/** Where `recording`, found open with its stored `rows` (in order), carries on. */
export function reopenPoint(recording: Recording, rows: readonly FixRow[]): ReopenPoint {
  return {
    nextSeq: rows.length > 0 ? rows[rows.length - 1].seq + 1 : 0,
    failedFixWrites: recording.failedFixWrites ?? 0,
    phase: recording.status === 'stopped' ? 'paused' : 'unfinished',
  };
}

import type { GapReason } from '@/features/routes/model/ride-recording';

import { CONSENT_VERSION } from './consent-version';
import { OTHER_WAY, currentWay, type Way } from './recording-rules';
import { RECORDING_VERSION, type Recording } from './recording-schema';
import type { RecordingDetails } from './recording-state';

/** A recording that starts now, with nothing in it yet. */
export function newRecording(id: string, startedAt: number): Recording {
  return {
    version: RECORDING_VERSION,
    id,
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
  };
}

/** The recording stopped at `at`, carrying the fix writes the phone could not keep. */
export function stoppedRecording(
  recording: Recording,
  at: number,
  failedFixWrites: number,
  extra?: Pick<Recording, 'hasAutoStopped'>,
): Recording {
  return {
    ...recording,
    ...extra,
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

/** A recording after a switch of way, and the way it is on now. */
export interface SwitchedWay {
  recording: Recording;
  to: Way;
}

/** The recording switched to the other way at `time`, and the way it is on now. */
export function switchedWay(recording: Recording, time: number): SwitchedWay {
  const switches = recording.switches ?? [];
  const to = OTHER_WAY[currentWay(switches)];
  return { recording: { ...recording, switches: [...switches, { time, to }] }, to };
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

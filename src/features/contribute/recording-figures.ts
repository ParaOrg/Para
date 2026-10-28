import type { RideSummary } from '@/features/routes/model/ride-recording';

import type { Recording } from './recording-schema';

/** What the stats strip shows. */
export interface RecordingFigures {
  elapsedSeconds: number;
  distanceM: number;
}

/**
 * The time a recording's totals are worked out to. A running recording runs to its last fix, or to
 * the end of the latest pause when that is later, so a Resume counts the pause as paused before
 * the first new fix comes. A stopped one runs to its Stop.
 */
export function summaryEnd(
  recording: Recording,
  isRecording: boolean,
  lastFixTime: number | null,
  now: number,
): number {
  const lastGapEnd = Math.max(0, ...recording.gaps.map((g) => g.to));
  return isRecording
    ? Math.max(lastFixTime ?? recording.startedAt, lastGapEnd)
    : (recording.stoppedAt ?? now);
}

/** Time recorded (pauses left out) and distance so far, as the clock reads `now`. */
export function liveFigures(
  recording: Recording,
  summary: Pick<RideSummary, 'distanceM' | 'pausedSeconds'>,
  isRecording: boolean,
  now: number,
): RecordingFigures {
  const end = isRecording ? now : (recording.stoppedAt ?? now);
  return {
    elapsedSeconds: Math.max(0, (end - recording.startedAt) / 1000 - summary.pausedSeconds),
    distanceM: summary.distanceM,
  };
}

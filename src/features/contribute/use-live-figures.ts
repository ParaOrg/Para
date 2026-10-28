import { useEffect, useMemo, useState } from 'react';

import { summarize, type Fix } from '@/features/routes/model/ride-recording';

import { liveFigures, summaryEnd, type RecordingFigures } from './recording-figures';
import type { Recording } from './recording-schema';

export interface LiveFigures {
  /** Time recorded and distance so far; null with no recording in hand. */
  figures: RecordingFigures | null;
  /** Sets the clock to `at`, so a Start or a Resume shows no time before it. */
  restartClock: (at: number) => void;
}

/** The live totals of the recording in hand, on a clock that ticks once a second while recording. */
export function useLiveFigures(
  current: Recording | null,
  fixes: readonly Fix[],
  isRecording: boolean,
): LiveFigures {
  const [now, setNow] = useState(() => Date.now());

  // The clock the live totals and the open silence run on.
  useEffect(() => {
    if (!isRecording) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isRecording]);

  // The totals come from the fixes alone (the fix-time `end`), so the 1 Hz clock only
  // adds the time since the last fix instead of running the rules again.
  const lastFixTime = fixes[fixes.length - 1]?.time ?? null;
  const summary = useMemo(() => {
    if (!current) return null;
    const end = summaryEnd(current, isRecording, lastFixTime, now);
    return summarize(fixes, current.gaps, current.startedAt, end);
    // `now` only ends a recording that is neither running nor stopped, which has no clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [fixes, current, isRecording, lastFixTime]);
  const figures = current && summary ? liveFigures(current, summary, isRecording, now) : null;

  return { figures, restartClock: setNow };
}

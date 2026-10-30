import { useMemo } from 'react';

import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import type { Fix } from '@/features/routes/model/ride-recording';

import { trailOf } from '../recorder/recording-rules';
import type { MarkRow, ModeRow } from '../storage/recording-schema';

export interface RecordingTrack {
  trail: RecordingTrail;
}

const NO_MODES: readonly ModeRow[] = [];
const NO_MARKS: readonly MarkRow[] = [];

/** What the map is shown of a recording, from the fixes that count: the trail so far. */
export function useRecordingTrack(
  kept: readonly Fix[],
  recordedModes: readonly ModeRow[] | undefined,
  recordedMarks: readonly MarkRow[] | undefined,
): RecordingTrack {
  const modes = recordedModes ?? NO_MODES;
  const marks = recordedMarks ?? NO_MARKS;
  const trail = useMemo(() => trailOf(kept, modes, marks), [kept, modes, marks]);

  return { trail };
}

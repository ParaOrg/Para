import { useMemo } from 'react';

import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import type { Fix } from '@/features/routes/model/ride-recording';

import { trailOf } from './recording-rules';
import type { SwitchRow } from './recording-schema';

export interface RecordingTrack {
  trail: RecordingTrail;
}

const NO_SWITCHES: readonly SwitchRow[] = [];

/** What the map is shown of a recording, from the fixes that count: the trail so far. */
export function useRecordingTrack(
  kept: readonly Fix[],
  recorded: readonly SwitchRow[] | undefined,
): RecordingTrack {
  const switches = recorded ?? NO_SWITCHES;
  const trail = useMemo(() => trailOf(kept, switches), [kept, switches]);

  return { trail };
}

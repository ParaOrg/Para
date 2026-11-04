import { useQuery } from '@tanstack/react-query';

import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { keptFixes } from '@/features/routes/model/ride-recording';

import { historyKeys } from '../history/history-keys';
import { fixOfRow } from '../recorder/recording-fixes';
import { trailOf } from '../recorder/recording-rules';
import type { Recording } from '../storage/recording-schema';
import { loadFixes } from '../storage/recording-store';

/** A saved ride's whole trail, from its fixes on this phone. */
async function fetchRideTrail(recording: Recording): Promise<RecordingTrail> {
  const fixes = (await loadFixes(recording.id)).map(fixOfRow);
  return trailOf(keptFixes(fixes), recording.modes, recording.marks ?? []);
}

/**
 * The trail of the ride whose screen shows, for the map to draw and frame: read once from this
 * phone's storage, as its fixes never change once saved. Null with no ride open, while it is read,
 * and for a ride uploaded from another phone, whose fixes this phone does not have.
 */
export function useRideTrail(recording: Recording | null): RecordingTrail | null {
  const query = useQuery({
    queryKey: historyKeys.trail(recording?.id ?? ''),
    queryFn: () => {
      if (!recording) throw new Error('No ride to read the trail of.');
      return fetchRideTrail(recording);
    },
    enabled: recording !== null,
    staleTime: Infinity,
  });
  return recording ? (query.data ?? null) : null;
}

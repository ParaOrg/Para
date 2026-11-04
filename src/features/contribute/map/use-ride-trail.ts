import { useQuery } from '@tanstack/react-query';

import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { keptFixes } from '@/features/routes/model/ride-recording';

import { historyKeys } from '../history/history-keys';
import { fixOfRow } from '../recorder/recording-fixes';
import { trailOf } from '../recorder/recording-rules';
import type { Recording } from '../storage/recording-schema';
import { loadFixes } from '../storage/recording-store';

/**
 * A ride's whole trail: from its fixes when it is saved on this phone (Lakad and Sakay drawn
 * apart); else the line Para keeps of the upload, drawn as one ride, read by a chunk of its own so
 * the page opens without it. Null when neither has a trail.
 */
async function fetchRideTrail(
  rideId: string,
  saved: Recording | null,
): Promise<RecordingTrail | null> {
  try {
    if (saved) {
      const fixes = (await loadFixes(saved.id)).map(fixOfRow);
      return trailOf(keptFixes(fixes), saved.modes, saved.marks ?? []);
    }
    const { fetchRideLine } = await import('../api/fetch-ride-line');
    const line = await fetchRideLine(rideId);
    return line && line.length >= 2
      ? { lines: [{ mode: 'ride', path: line }], markers: [], marks: [] }
      : null;
  } catch (error) {
    // The screen still shows the ride, with no trail on its map: said here, so it is not lost.
    console.warn("A ride's trail could not be read; its map shows none.", error);
    throw error;
  }
}

/**
 * The trail of the ride whose screen shows, `rideId`, for the map to draw and frame: an overview
 * of the whole ride, read once, as a saved ride's fixes and an upload's line never change. `saved`
 * is the ride when this phone keeps it. Null with no ride open, while it is read, when the ride has
 * no trail anywhere, and when the read failed (warned in fetchRideTrail): the screen works the
 * same, its map without the trail.
 */
export function useRideTrail(
  rideId: string | null,
  saved: Recording | null,
): RecordingTrail | null {
  const query = useQuery({
    queryKey: historyKeys.trail(rideId ?? ''),
    queryFn: () => {
      if (rideId === null) throw new Error('No ride to read the trail of.');
      return fetchRideTrail(rideId, saved);
    },
    enabled: rideId !== null,
    staleTime: Infinity,
  });
  return rideId === null ? null : (query.data ?? null);
}

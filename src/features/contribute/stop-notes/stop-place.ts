import { distanceToRingM } from '@/features/routes/geo/ring';
import { hotspotLabel, hotspotRing, type Hotspot } from '@/features/routes/model/hotspots';
import type { LngLat } from '@/shared/utils/geo';

/** How far a published hotspot may be from a flagged stop and still name it. */
export const NEAR_PLACE_M = 500;

/** What a stop's place says when no hotspot Para has is near it. */
export const NO_NEARBY_PLACE = 'No nearby place';

/** What a stop's place says while the published hotspots are being read. */
export const FINDING_PLACE = 'Finding the place…';

/**
 * The nearest published hotspot's name for a flagged stop: its own name inside its box, "Near …"
 * within NEAR_PLACE_M of it, and NO_NEARBY_PLACE beyond that or with no position.
 */
export function stopPlaceName(at: LngLat | null, hotspots: readonly Hotspot[]): string {
  if (!at) return NO_NEARBY_PLACE;
  let nearest: Hotspot | null = null;
  let nearestM = Infinity;
  for (const hotspot of hotspots) {
    const metres = distanceToRingM(at, hotspotRing(hotspot));
    if (metres < nearestM) {
      nearest = hotspot;
      nearestM = metres;
    }
  }
  if (!nearest || nearestM > NEAR_PLACE_M) return NO_NEARBY_PLACE;
  return nearestM === 0 ? hotspotLabel(nearest) : `Near ${hotspotLabel(nearest)}`;
}

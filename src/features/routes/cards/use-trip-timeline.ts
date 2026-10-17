import { useMemo } from 'react';

import type { LngLat } from '@/shared/utils/geo';

import type { Hotspot } from '../model/hotspots';
import { routeTimeline } from '../model/ride';
import { directionLine, type Direction } from '../model/routes';

interface TripTimelineHotspots {
  hotspots: readonly Hotspot[];
  /** The hotspots a direction passes, along its line (useSavedHotspots). */
  hotspotsAlong: (directionId: string, line: readonly LngLat[]) => Hotspot[];
}

/**
 * The open trip's hintuans, its timeline, for the trip card's rows and the dots along its line
 * alike; null with no trip open. Worked out as the trip or the hotspots change, not at each render
 * of the page: they read nothing else (timeline-test).
 */
export function useTripTimeline(
  trip: Direction | null,
  { hotspots, hotspotsAlong }: TripTimelineHotspots,
  /** A loop's tip (useLoopTip): the row its timeline leaves from and comes back to. */
  tipId: string | null = null,
) {
  return useMemo(
    () =>
      trip
        ? routeTimeline(trip, hotspots, hotspotsAlong(trip.id, directionLine(trip)), tipId)
        : null,
    [trip, hotspots, hotspotsAlong, tipId],
  );
}

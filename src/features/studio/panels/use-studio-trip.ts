import type { MapLibreMap } from 'maplibre-gl';
import { useMemo } from 'react';

import { useTripTimeline } from '@/features/routes/cards/use-trip-timeline';
import { useLitRides } from '@/features/routes/map/use-lit-rides';
import type { Ridden } from '@/features/routes/map/use-ride-to';

interface UseStudioTripOptions {
  map: MapLibreMap | null;
  saved: Parameters<typeof useLitRides>[1];
  hotspots: Parameters<typeof useTripTimeline>[1];
  /** The direction being redrawn: no lit stretches over the draft. */
  hiddenDirectionId: string | null;
  /** The ride picked on the open trip (useRideTo's). */
  ride: { ridden: Ridden | null; startId: string | null };
}

/**
 * The rides lit on the map, the open trip's timeline and the pill's route
 * count.
 */
export function useStudioTrip({
  map,
  saved,
  hotspots,
  hiddenDirectionId,
  ride,
}: UseStudioTripOptions) {
  // What the lit routes wear on the map, as on the public map (useLitRides);
  // none of the green stretches over the direction being redrawn.
  const rides = useLitRides(
    map,
    saved,
    hotspots.hotspots,
    hiddenDirectionId,
    ride.ridden,
    ride.startId,
  );

  // The open trip's hintuans, as the public map works them out
  // (useTripTimeline): the card's rows and their dots along the line read one
  // timeline, and the dots hang on its identity — a fresh `between` each
  // render would place every dot anew (StationLabels' rowStops memo) — so the
  // memo is load-bearing, not a saving.
  const timeline = useTripTimeline(saved.selected, hotspots);

  // The pill counts routes, not directions: a route is two rows, one of them
  // perhaps an empty slot, so counting rows would read five routes as "10 routes".
  const routeCount = useMemo(
    () => new Set(saved.directions.map((v) => v.routeId)).size,
    [saved.directions],
  );

  return { rides, timeline, routeCount };
}

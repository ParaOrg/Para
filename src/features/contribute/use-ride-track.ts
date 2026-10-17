import { useMemo } from 'react';

import type { RideTrail } from '@/features/routes/map/ride-trail';
import { keptFixes, type Fix } from '@/features/routes/model/ride-recording';

import type { SwitchRow } from './recording-schema';
import { courseBearing, legsOf, markersOf, type SwitchEvent } from './ride-rules';

export interface RideTrack {
  trail: RideTrail;
  /** The direction of travel in degrees from north, or null while standing still. */
  bearing: number | null;
}

const NO_SWITCHES: readonly SwitchRow[] = [];

/** What the map is shown of a recording: the trail drawn so far, and which way the ride is heading. */
export function useRideTrack(
  fixes: readonly Fix[],
  recorded: readonly SwitchRow[] | undefined,
): RideTrack {
  const switchRows = recorded ?? NO_SWITCHES;
  return useMemo(() => {
    const switches: SwitchEvent[] = switchRows.map((s) => ({ time: s.time, at: [s.lng, s.lat] }));
    return {
      trail: {
        legs: legsOf(fixes, switches).map((leg) => ({ direction: leg.name, path: leg.path })),
        markers: markersOf(switches),
        here: keptFixes(fixes).at(-1)?.at ?? null,
      },
      bearing: courseBearing(fixes),
    };
  }, [fixes, switchRows]);
}

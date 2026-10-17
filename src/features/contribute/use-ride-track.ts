import { useMemo, useState } from 'react';

import type { RideTrail } from '@/features/routes/map/ride-trail';
import { keptFixes, type Fix } from '@/features/routes/model/ride-recording';

import type { SwitchRow } from './recording-schema';
import { courseBearing, trailOf } from './ride-rules';

export interface RideTrack {
  trail: RideTrail;
  /** The direction of travel in degrees from north: the last one found, held while standing still. */
  bearing: number | null;
}

const NO_SWITCHES: readonly SwitchRow[] = [];

/** What the map is shown of a recording: the trail drawn so far, and which way the ride is heading. */
export function useRideTrack(
  fixes: readonly Fix[],
  recorded: readonly SwitchRow[] | undefined,
): RideTrack {
  const switches = recorded ?? NO_SWITCHES;
  const kept = useMemo(() => keptFixes(fixes), [fixes]);
  const trail = useMemo(() => trailOf(kept, switches), [kept, switches]);

  // The rule takes the heading it had and gives it back while the ride stands
  // still, so the heading is state the next fix is measured against.
  const [bearing, setBearing] = useState<number | null>(null);
  const next = kept.length === 0 ? null : courseBearing(kept, bearing);
  if (next !== bearing) setBearing(next);

  return { trail, bearing: next };
}

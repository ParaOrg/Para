import { useEffect, useState } from 'react';

import type { Hotspot } from '@/features/routes/model/hotspots';
import type { LngLat } from '@/shared/utils/geo';

import { FINDING_PLACE, NO_NEARBY_PLACE, stopPlaceName } from './stop-place';
import { readPublishedIndex } from '../map/published-source';

type HotspotsRead = { status: 'reading' } | { status: 'read'; hotspots: readonly Hotspot[] };

/**
 * Each flagged stop's place, by the published hotspots. They are read once the stops are shown,
 * in an effect, as every read of the published map is on the pages that carry no query client
 * for it (.claude/CLAUDE.md, Hooks and effects). Unread (offline before the map was kept), every
 * stop says it has no nearby place. While the stops' own positions are still being read
 * (`isTrailReading`), each is still finding its place.
 */
export function useStopPlaces(
  points: readonly (LngLat | null)[],
  isTrailReading = false,
): string[] {
  const [read, setRead] = useState<HotspotsRead>({ status: 'reading' });
  useEffect(() => {
    let isLeft = false;
    readPublishedIndex().then(
      ({ hotspots }) => {
        if (!isLeft) setRead({ status: 'read', hotspots });
      },
      (error: unknown) => {
        console.warn('The published hotspots could not be read; stops show no place.', error);
        if (!isLeft) setRead({ status: 'read', hotspots: [] });
      },
    );
    return () => {
      isLeft = true;
    };
  }, []);
  if (read.status === 'reading' || isTrailReading) return points.map(() => FINDING_PLACE);
  return points.map((at) => (at ? stopPlaceName(at, read.hotspots) : NO_NEARBY_PLACE));
}

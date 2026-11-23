import { useMemo } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import { draftOnlyDirections, draftOnlyHotspots } from '../data/draft-only';
import { useReviewQuery } from '../data/use-review-query';

interface UseDraftOnlyOptions {
  /** Signed out, there are no drafts to read. */
  isSignedIn: boolean;
  directions: readonly DirectionRow[];
  hotspots: readonly HotspotRow[];
}

/**
 * The routes' directions and the hotspots that are drafts only, with no approved row: what the
 * sidebar opens them by (draft-only.ts). Read from the drafts list the map's draft lines read.
 */
export function useDraftOnly({ isSignedIn, directions, hotspots }: UseDraftOnlyOptions) {
  const drafts = useReviewQuery({ isEnabled: isSignedIn }).data;
  // Memoized: the lists feed the save target and the sidebar on every render of the workshop.
  const draftDirections = useMemo(
    () =>
      drafts
        ? draftOnlyDirections(drafts, new Set(directions.map((v) => v.routeId)), hotspots)
        : [],
    [drafts, directions, hotspots],
  );
  const draftHotspots = useMemo(
    () => (drafts ? draftOnlyHotspots(drafts, new Set(hotspots.map((s) => s.id))) : []),
    [drafts, hotspots],
  );
  return { directions: draftDirections, hotspots: draftHotspots };
}

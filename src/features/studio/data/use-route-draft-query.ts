import { useQuery } from '@tanstack/react-query';

import { draftOf } from './drafts';
import { STUDIO_DRAFTS } from './flags';
import { reviewKeys } from './review-keys';

/**
 * The draft kept for a route, if any: the same read the card's lock makes
 * (use-draft-lock.ts), so the two share one request. Off with drafts off.
 */
export function useRouteDraftQuery(routeId: string) {
  return useQuery({
    queryKey: reviewKeys.draftOf('route', routeId),
    queryFn: () => draftOf('route', routeId),
    enabled: STUDIO_DRAFTS,
  });
}

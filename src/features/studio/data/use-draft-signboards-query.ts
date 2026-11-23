import { useQuery } from '@tanstack/react-query';

import { draftOf } from './drafts';
import { reviewKeys } from './review-keys';
import { draftedSignboards } from './signboards';

/**
 * A direction's signboards as the route's draft lists them, null when there is
 * no draft of it. Read under the key the card's lock reads the draft by
 * (use-draft-lock.ts), so a fresh read for either serves both. The draft is
 * parsed in `select`, so a payload that does not parse is this query's error,
 * not a throw in the card.
 */
export function useDraftSignboardsQuery(routeId: string, directionId: string) {
  return useQuery({
    queryKey: reviewKeys.draftOf('route', routeId),
    queryFn: () => draftOf('route', routeId),
    select: (draft) => draftedSignboards(draft, directionId),
  });
}

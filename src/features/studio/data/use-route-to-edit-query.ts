import { useQuery } from '@tanstack/react-query';

import type { DirectionRow } from '@/features/routes/model/routes';

import { draftOf } from './drafts';
import { STUDIO_DRAFTS } from './flags';
import { reviewKeys } from './review-keys';
import { routeToEdit } from './route-to-edit';

/**
 * The route's facts as the save panel starts from them (route-to-edit.ts),
 * read under the key the card's lock and the signboards read the draft by.
 * Parsed in `select`, so a draft that does not parse is this query's error.
 * Off with drafts off, and with no route.
 */
export function useRouteToEditQuery(route: DirectionRow['route'] | null) {
  const routeId = route?.id ?? '';
  return useQuery({
    queryKey: reviewKeys.draftOf('route', routeId),
    queryFn: () => draftOf('route', routeId),
    select: (draft) => (route ? routeToEdit(route, draft) : null),
    enabled: STUDIO_DRAFTS && route !== null,
  });
}

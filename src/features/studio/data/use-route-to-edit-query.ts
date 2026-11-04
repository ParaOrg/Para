import { useQuery, useQueryClient } from '@tanstack/react-query';

import type { DirectionRow } from '@/features/routes/model/routes';

import { draftOf } from './drafts';
import { STUDIO_DRAFTS } from './flags';
import { reviewKeys } from './review-keys';
import type { DraftRow } from './review-schema';
import { routeToEdit } from './route-to-edit';
import { useStudioSession } from '../auth/use-studio-session';

/**
 * The route's facts as the save panel starts from them (route-to-edit.ts),
 * read under the key the card's lock and the signboards read the draft by.
 * Parsed in `select`, so a draft that does not parse is this query's error.
 * Off with drafts off, and with no route.
 */
export function useRouteToEditQuery(route: DirectionRow['route'] | null) {
  const userId = useStudioSession()?.user.id ?? null;
  const routeId = route?.id ?? '';
  return useQuery({
    queryKey: reviewKeys.draftOf('route', routeId),
    queryFn: () => draftOf('route', routeId),
    select: (draft) => (route ? routeToEdit(route, draft, userId) : null),
    enabled: STUDIO_DRAFTS && route !== null,
  });
}

/**
 * Reads a route's draft for Edit route through the cache, fresh at the press:
 * the drawing opens from it (drawing-to-edit.ts), and the save form's query
 * (above) then starts from the same read, not from one older than the last save.
 */
export function useReadRouteDraft() {
  const client = useQueryClient();
  return (routeId: string): Promise<DraftRow | null> =>
    client.fetchQuery({
      queryKey: reviewKeys.draftOf('route', routeId),
      queryFn: () => draftOf('route', routeId),
      staleTime: 0,
    });
}

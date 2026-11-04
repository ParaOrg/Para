import { transportModeSchema } from '@/features/routes/model/direction-schema';
import type { DirectionRow } from '@/features/routes/model/routes';

import type { DraftRow } from './review-schema';
import { routeStateFromDraft } from './route-draft-state';

type NamedRoute = DirectionRow['route'];

/**
 * The route's facts as the editor's own draft of it has them, else as approved:
 * the save panel starts from these, and a save builds on the draft
 * (draft-reads.ts routeDraftState), so starting from the approved signboard,
 * via, mode, fare note or ends would save them over the draft's. The name stays
 * the one the list generated. Another editor's draft never reaches this: the
 * card offers no Edit on it.
 */
export function routeToEdit(approved: NamedRoute, draft: DraftRow | null): NamedRoute {
  if (!draft) return approved;
  const { route } = routeStateFromDraft(draft);
  return {
    id: approved.id,
    name: approved.name,
    routeCode: approved.routeCode,
    shortName: approved.shortName,
    longName: approved.longName,
    fareAsOf: approved.fareAsOf,
    signboard: route.signboard,
    mode: transportModeSchema.parse(route.mode),
    fareNote: route.fare_note,
    via: route.via,
    headHotspotId: route.head_stop_id,
    tailHotspotId: route.tail_stop_id,
    ...(route.is_loop ? { isLoop: true as const } : {}),
  };
}

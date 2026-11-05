import type { DirectionDrawing, DirectionRow } from '@/features/routes/model/routes';

import { isAnothersDraft } from '../data/draft-lock';
import type { DraftRow } from '../data/review-schema';
import type { Drawing } from '../drawing/use-drawing';

interface UseOpenDraftOptions {
  /** The map's directions, approved: a draft of a route on the map opens through one of them. */
  directions: readonly DirectionRow[];
  /** The signed-in editor, whose own drafts open into editing. */
  userId: string | null;
  draw: Pick<Drawing, 'load'>;
  /** Opens a direction's drawing to edit: the editor's own draft of it when there is one (useFollow). */
  opening: (
    v: DirectionRow,
    then: (d: DirectionDrawing) => void,
    options?: { isToEdit?: boolean },
  ) => Promise<void>;
  /** Opens a direction's card, where another editor's draft says who is changing it. */
  openTrip: (v: { id: string }) => void;
}

/**
 * A draft tapped on the map, opened straight into editing: the editor's own draft of a route on
 * the map opens Edit route on it, with the sidebar; another editor's opens the route's card,
 * which says who is changing it, to read. True when it opened. A hotspot's draft, or a route that
 * is a draft only, is left to Drafts until the drawing opens from a draft alone.
 */
export function useOpenDraft({ directions, userId, draw, opening, openTrip }: UseOpenDraftOptions) {
  return (draft: DraftRow): boolean => {
    if (draft.kind !== 'route') return false;
    const direction = directions.find((v) => v.routeId === draft.subject_id && v.shape !== null);
    if (!direction) return false;
    if (userId !== null && isAnothersDraft(draft, userId)) {
      openTrip(direction);
      return true;
    }
    void opening(direction, draw.load, { isToEdit: true });
    return true;
  };
}

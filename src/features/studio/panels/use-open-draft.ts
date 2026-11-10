import { hotspotRing, type HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionDrawing, DirectionRow } from '@/features/routes/model/routes';

import { isAnothersDraft } from '../data/draft-lock';
import type { DraftRow } from '../data/review-schema';
import { useFetchHotspotToEdit } from '../data/use-hotspot-to-edit-query';
import type { Drawing } from '../drawing/use-drawing';

interface UseOpenDraftOptions {
  /** The map's directions, approved: a draft of a route on the map opens through one of them. */
  directions: readonly DirectionRow[];
  /** The directions of routes that are drafts only (useDraftOnly). */
  draftDirections: readonly DirectionRow[];
  /** The map's hotspots, approved, and those that are drafts only. */
  hotspots: readonly HotspotRow[];
  draftHotspots: readonly HotspotRow[];
  /** The signed-in editor, whose own drafts open into editing. */
  userId: string | null;
  draw: Pick<Drawing, 'load' | 'loadArea'>;
  /** Opens a direction's drawing to edit: the editor's own draft of it when there is one (useFollow). */
  opening: (
    v: DirectionRow,
    then: (d: DirectionDrawing) => void,
    options?: { isToEdit?: boolean },
  ) => Promise<void>;
  /** Opens a direction's card, where another editor's draft says who is changing it. */
  openTrip: (v: { id: string }) => void;
  /** Opens a hotspot's card, which opens its sidebar beside the map on a computer. */
  openPlace: (hotspotId: string) => void;
  /** Says what went wrong opening it. */
  setNotice: (text: string) => void;
}

/**
 * A draft tapped on the map, opened into its sidebar. The editor's own draft of a route opens
 * Edit route on it, a route that is a draft only included; another editor's opens the route's
 * card, which says who is changing it. A tapped line opens its own direction; a marker, which
 * names none, the route's first drawn one. A hotspot on the map opens its card, which opens its
 * sidebar; one that is a draft only opens its outline to edit. True when it opened; another
 * editor's draft of a subject with no approved row is left to Drafts.
 */
export function useOpenDraft({
  directions,
  draftDirections,
  hotspots,
  draftHotspots,
  userId,
  draw,
  opening,
  openTrip,
  openPlace,
  setNotice,
}: UseOpenDraftOptions) {
  const fetchToEdit = useFetchHotspotToEdit();
  const isAnothers = (draft: DraftRow) => userId !== null && isAnothersDraft(draft, userId);

  const openHotspot = (draft: DraftRow): boolean => {
    if (hotspots.some((s) => s.id === draft.subject_id)) {
      openPlace(draft.subject_id);
      return true;
    }
    const drafted = draftHotspots.find((s) => s.id === draft.subject_id);
    if (!drafted || isAnothers(draft)) return false;
    fetchToEdit(drafted).then(
      ({ hotspot }) => draw.loadArea(hotspot.kind, hotspot.id, hotspotRing(hotspot)),
      (err: unknown) => setNotice(err instanceof Error ? err.message : String(err)),
    );
    return true;
  };

  return (draft: DraftRow, directionId?: string): boolean => {
    if (draft.kind === 'hotspot') return openHotspot(draft);
    const isDrawnOf = (v: DirectionRow) =>
      v.routeId === draft.subject_id &&
      v.shape !== null &&
      (directionId === undefined || v.id === directionId);
    const approved = directions.find(isDrawnOf);
    if (approved && isAnothers(draft)) {
      openTrip(approved);
      return true;
    }
    const direction = approved ?? draftDirections.find(isDrawnOf);
    if (!direction || isAnothers(draft)) return false;
    void opening(direction, draw.load, { isToEdit: true });
    return true;
  };
}

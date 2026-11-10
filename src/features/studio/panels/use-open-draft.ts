import { hotspotRing, type HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionDrawing, DirectionRow } from '@/features/routes/model/routes';

import { isAnothersDraft } from '../data/draft-lock';
import type { DraftRow } from '../data/review-schema';
import { useFetchHotspotToEdit } from '../data/use-hotspot-to-edit-query';
import type { Drawing } from '../drawing/use-drawing';

/**
 * What a tap on a draft did: opened it (its sidebar or its card), found it held by another editor
 * with no card to open (the map then shows its own sheet), or could not read it (a notice says so).
 */
export type DraftOpening = 'opened' | 'held' | 'unreadable';

/** Said when a draft's line or outline cannot be read from it. */
export const CANNOT_OPEN = 'This draft cannot be opened: its line or outline could not be read.';

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
 * sidebar; one that is a draft only opens its outline to edit. Another editor's draft of a subject
 * with no approved row has no card: 'held', and the map shows its sheet (HeldDraftSheet).
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

  // A draft whose payload cannot be read says so.
  const cannotOpen = (): DraftOpening => {
    setNotice(CANNOT_OPEN);
    return 'unreadable';
  };

  const openHotspot = (draft: DraftRow): DraftOpening => {
    if (hotspots.some((s) => s.id === draft.subject_id)) {
      openPlace(draft.subject_id);
      return 'opened';
    }
    const drafted = draftHotspots.find((s) => s.id === draft.subject_id);
    if (!drafted) return cannotOpen();
    if (isAnothers(draft)) return 'held';
    fetchToEdit(drafted).then(
      ({ hotspot }) => draw.loadArea(hotspot.kind, hotspot.id, hotspotRing(hotspot)),
      (err: unknown) => setNotice(err instanceof Error ? err.message : String(err)),
    );
    return 'opened';
  };

  return (draft: DraftRow, directionId?: string): DraftOpening => {
    if (draft.kind === 'hotspot') return openHotspot(draft);
    const isDrawnOf = (v: DirectionRow) =>
      v.routeId === draft.subject_id &&
      v.shape !== null &&
      (directionId === undefined || v.id === directionId);
    const approved = directions.find(isDrawnOf);
    if (approved && isAnothers(draft)) {
      openTrip(approved);
      return 'opened';
    }
    const direction = approved ?? draftDirections.find(isDrawnOf);
    if (!direction) return cannotOpen();
    if (isAnothers(draft)) return 'held';
    void opening(direction, draw.load, { isToEdit: true });
    return 'opened';
  };
}

import { hotspotRing, type HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionDrawing, DirectionRow } from '@/features/routes/model/routes';

import { useIsWideScreen } from './use-is-wide-screen';
import { isAnothersDraft } from '../data/draft-lock';
import type { DraftRow } from '../data/review-schema';
import { useFetchHotspotToEdit } from '../data/use-hotspot-to-edit-query';
import type { Drawing } from '../drawing/use-drawing';

/**
 * What a tap on a draft did: opened it (its sidebar or its card), found it held by another editor
 * with no card to open (the map then shows its own sheet), could not read it (a notice says so),
 * or, on a computer, found a place that is a draft only, for the map to show its card.
 */
export type DraftOpening = 'opened' | 'held' | 'unreadable' | { place: HotspotRow };

/** Said when a draft's line or outline cannot be read from it. */
export const CANNOT_OPEN = 'This draft cannot be opened: its line or outline could not be read.';

interface UseOpenDraftOptions {
  /** The map's directions, approved: a draft of a route on the map opens through one of them. */
  saved: { directions: readonly DirectionRow[] };
  /** The directions of routes that are drafts only (useDraftOnly). */
  draftDirections: readonly DirectionRow[];
  /** The map's hotspots, approved, and those that are drafts only. */
  hotspots: readonly HotspotRow[];
  draftHotspots: readonly HotspotRow[];
  /** The signed-in editor, whose own drafts open in the route line detail or their card. */
  userId: string | null;
  draw: Pick<Drawing, 'load' | 'loadArea'>;
  /** Opens a direction's drawing to edit: the editor's own draft of it when there is one (useFollow). */
  opening: (
    v: DirectionRow,
    then: (d: DirectionDrawing) => void,
    options?: { isToEdit?: boolean },
  ) => Promise<void>;
  /**
   * Opens a direction's card or detail, where another editor's draft says who is changing it;
   * closes them for a route that is a draft only, whose detail takes their place.
   */
  cards: { openTrip: (v: { id: string }) => void; closeAll: () => void };
  /** Opens a hotspot's card, which opens its sidebar beside the map on a computer. */
  openPlace: (hotspotId: string) => void;
  /** Says what went wrong opening it. */
  setNotice: (text: string) => void;
  /** Which draft-only route's detail is open (useDraftTrip): the page reads it before the cards. */
  draftTrip: { open: (directionId: string | null) => void };
}

/**
 * A draft tapped on the map, opened to read first: editing starts from Edit Route. A draft of a
 * route on the map opens the route's card (its route line detail on a computer), which says when
 * another editor is changing it; a way of it only the draft draws opens Edit Route on the
 * editor's own draft. A route that is a draft only opens on a computer in the route line
 * detail from its draft (useDraftTrip's `trip`); a phone has no card for it and opens Edit Route on it. A tapped
 * line opens its own direction; a marker, which names none, the route's first drawn one. A hotspot
 * on the map opens its card; one that is a draft only, on a computer, the map's DraftPlaceCard
 * (`{ place }`), whose Edit asks again with `isToEdit` for its outline; on a phone, its outline.
 * Another editor's other drafts with no approved row: 'held', and the map shows HeldDraftSheet.
 */
export function useOpenDraft({
  saved,
  draftDirections,
  hotspots,
  draftHotspots,
  userId,
  draw,
  opening,
  cards,
  openPlace,
  setNotice,
  draftTrip,
}: UseOpenDraftOptions) {
  const fetchToEdit = useFetchHotspotToEdit();
  const isWideScreen = useIsWideScreen();
  const isAnothers = (draft: DraftRow) => userId !== null && isAnothersDraft(draft, userId);

  // A draft whose payload cannot be read says so.
  const cannotOpen = (): DraftOpening => {
    setNotice(CANNOT_OPEN);
    return 'unreadable';
  };

  const openHotspot = (draft: DraftRow, isToEdit: boolean): DraftOpening => {
    if (hotspots.some((s) => s.id === draft.subject_id)) {
      openPlace(draft.subject_id);
      return 'opened';
    }
    const drafted = draftHotspots.find((s) => s.id === draft.subject_id);
    if (!drafted) return cannotOpen();
    if (isWideScreen && !isToEdit) return { place: drafted };
    if (isAnothers(draft)) return 'held';
    fetchToEdit(drafted).then(
      ({ hotspot }) => draw.loadArea(hotspot.kind, hotspot.id, hotspotRing(hotspot)),
      (err: unknown) => setNotice(err instanceof Error ? err.message : String(err)),
    );
    return 'opened';
  };

  const open = (draft: DraftRow, directionId?: string, isToEdit = false): DraftOpening => {
    if (draft.kind === 'hotspot') return openHotspot(draft, isToEdit);
    const isTapped = (v: DirectionRow) => directionId === undefined || v.id === directionId;
    const isDrawn = (v: DirectionRow) => v.shape !== null;
    const approvedWays = saved.directions.filter((v) => v.routeId === draft.subject_id);
    const approved = approvedWays.find((v) => isDrawn(v) && isTapped(v));
    if (approved) {
      draftTrip.open(null);
      cards.openTrip(approved);
      return 'opened';
    }
    // A way of a route on the map that only the draft draws (its slot, the return trip): there is
    // no approved line of it to read. The editor's own opens Edit Route on the draft; another's,
    // the route's drawn way, whose card says who is changing it.
    const undrawn = approvedWays.find(isTapped);
    if (undrawn) {
      if (!isAnothers(draft)) {
        void opening(undrawn, draw.load, { isToEdit: true });
        return 'opened';
      }
      const drawn = approvedWays.find(isDrawn);
      if (!drawn) return 'held';
      cards.openTrip(drawn);
      return 'opened';
    }
    const direction = draftDirections.find(
      (v) => v.routeId === draft.subject_id && isDrawn(v) && isTapped(v),
    );
    if (!direction) return cannotOpen();
    if (isAnothers(draft)) return 'held';
    if (!isWideScreen) {
      void opening(direction, draw.load, { isToEdit: true });
      return 'opened';
    }
    // The detail takes the left panel: an approved route's or a hotspot's card leaves it.
    cards.closeAll();
    draftTrip.open(direction.id);
    return 'opened';
  };

  return open;
}

import { useState } from 'react';

import { hotspotRing, type HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionDrawing, DirectionRow } from '@/features/routes/model/routes';

import { useIsWideScreen } from './use-is-wide-screen';
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

/** A route that is a draft only, open in the route line detail from its draft (useOpenDraft). */
export interface DraftTrip {
  direction: DirectionRow;
  /** The directions of the routes that are drafts only: the detail's tabs and destinations. */
  directions: readonly DirectionRow[];
  /** Another of them in this one's place. */
  show: (direction: DirectionRow) => void;
  close: () => void;
}

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
  /** Opens a direction's card or detail, where another editor's draft says who is changing it. */
  cards: { open: boolean; openTrip: (v: { id: string }) => void };
  /** Opens a hotspot's card, which opens its sidebar beside the map on a computer. */
  openPlace: (hotspotId: string) => void;
  /** Says what went wrong opening it. */
  setNotice: (text: string) => void;
}

/**
 * A draft tapped on the map, opened to read first: editing starts from Edit Route. A draft of a
 * route on the map opens the route's card (its route line detail on a computer), which says when
 * another editor is changing it. A route that is a draft only opens on a computer in the route line
 * detail from its draft (`trip`); a phone has no card for it and opens Edit Route on it. A tapped
 * line opens its own direction; a marker, which names none, the route's first drawn one. A hotspot
 * on the map opens its card, which opens its sidebar; one that is a draft only opens its outline to
 * edit. Another editor's draft of a subject with no approved row has no card: 'held', and the map
 * shows its sheet (HeldDraftSheet).
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
}: UseOpenDraftOptions) {
  const fetchToEdit = useFetchHotspotToEdit();
  const isWideScreen = useIsWideScreen();
  const [tripId, setTripId] = useState<string | null>(null);
  // A card opened over it, an approved route's or a hotspot's, takes its place for good: closing
  // that card leaves the map, not this draft.
  const [wasCardOpen, setWasCardOpen] = useState(cards.open);
  if (cards.open !== wasCardOpen) {
    setWasCardOpen(cards.open);
    if (cards.open) setTripId(null);
  }
  const tripDirection = draftDirections.find((v) => v.id === tripId);
  const trip: DraftTrip | null = tripDirection
    ? {
        direction: tripDirection,
        directions: draftDirections,
        show: (v) => setTripId(v.id),
        close: () => setTripId(null),
      }
    : null;
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

  const open = (draft: DraftRow, directionId?: string): DraftOpening => {
    if (draft.kind === 'hotspot') return openHotspot(draft);
    const isDrawnOf = (v: DirectionRow) =>
      v.routeId === draft.subject_id &&
      v.shape !== null &&
      (directionId === undefined || v.id === directionId);
    const approved = saved.directions.find(isDrawnOf);
    if (approved) {
      setTripId(null);
      cards.openTrip(approved);
      return 'opened';
    }
    const direction = draftDirections.find(isDrawnOf);
    if (!direction) return cannotOpen();
    if (isAnothers(draft)) return 'held';
    if (isWideScreen) setTripId(direction.id);
    else void opening(direction, draw.load, { isToEdit: true });
    return 'opened';
  };

  return { open, trip };
}

import { useQueryClient } from '@tanstack/react-query';
import type { MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { DraftLines } from './draft-lines';
import { DraftMarkers } from './draft-markers';
import { HeldDraftSheet } from './held-draft-sheet';
import { subscribeReviewChanges } from '../data/review-events';
import { reviewKeys } from '../data/review-keys';
import type { DraftRow } from '../data/review-schema';
import { useReviewNames, useReviewQuery } from '../data/use-review-query';
import type { DraftOpening } from '../panels/use-open-draft';

interface StudioDraftsProps {
  map: MapLibreMap | null;
  /** A draft tapped on the map, with the direction whose line was tapped when known (useOpenDraft). */
  onOpenDraft: (draft: DraftRow, directionId?: string) => DraftOpening;
  /** Another editor's new draft approved from its sheet: the map reads its rows again. */
  onApproved: () => void;
}

/**
 * Every draft on the map, signed in: a route's drawn ways dashed, a mark at each draft. A tap
 * opens it into its sidebar (useOpenDraft); another editor's new draft, which has no card, into
 * its sheet (HeldDraftSheet). The list is read again whenever a draft changes here.
 */
export function StudioDrafts({ map, onOpenDraft, onApproved }: StudioDraftsProps) {
  const client = useQueryClient();
  const query = useReviewQuery();
  const names = useReviewNames(query.data ?? []);
  useEffect(
    () =>
      subscribeReviewChanges(() => {
        void client.invalidateQueries({ queryKey: reviewKeys.all });
      }),
    [client],
  );
  // onOpenDraft is a new function every render (useOpenDraft); the ref keeps the tap the map's
  // layers listen with changing only when the drafts do.
  const onOpenDraftRef = useRef(onOpenDraft);
  useEffect(() => {
    onOpenDraftRef.current = onOpenDraft;
  }, [onOpenDraft]);
  const drafts = query.data;
  // Another editor's new draft tapped: it has no card, so its sheet shows here.
  const [held, setHeld] = useState<DraftRow | null>(null);
  const openDraft = useCallback(
    (id: string, directionId?: string) => {
      const draft = drafts?.find((d) => d.id === id);
      if (draft && onOpenDraftRef.current(draft, directionId) === 'held') setHeld(draft);
    },
    [drafts],
  );
  if (!drafts) return null;
  return (
    <>
      <DraftLines map={map} drafts={drafts} onReview={openDraft} />
      <DraftMarkers map={map} drafts={drafts} places={names} onReview={openDraft} />
      {held && (
        <HeldDraftSheet
          key={held.id}
          draft={held}
          places={names}
          onApproved={onApproved}
          onClose={() => setHeld(null)}
        />
      )}
    </>
  );
}

import { useQueryClient } from '@tanstack/react-query';
import type { MapLibreMap } from 'maplibre-gl';
import { useCallback, useEffect, useRef } from 'react';

import { DraftLines } from './draft-lines';
import { DraftMarkers } from './draft-markers';
import { subscribeReviewChanges } from '../data/review-events';
import { reviewKeys } from '../data/review-keys';
import type { DraftRow } from '../data/review-schema';
import { useReviewNames, useReviewQuery } from '../data/use-review-query';

interface StudioDraftsProps {
  map: MapLibreMap | null;
  /** A draft tapped on the map, with the direction whose line was tapped when known (useOpenDraft). */
  onOpenDraft: (draft: DraftRow, directionId?: string) => void;
}

/**
 * Every draft on the map, signed in: a route's drawn ways dashed, a mark at each draft. A tap
 * opens it into its sidebar (useOpenDraft). The list is read again whenever a draft changes here.
 */
export function StudioDrafts({ map, onOpenDraft }: StudioDraftsProps) {
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
  const openDraft = useCallback(
    (id: string, directionId?: string) => {
      const draft = drafts?.find((d) => d.id === id);
      if (draft) onOpenDraftRef.current(draft, directionId);
    },
    [drafts],
  );
  if (!drafts) return null;
  return (
    <>
      <DraftLines map={map} drafts={drafts} onReview={openDraft} />
      <DraftMarkers map={map} drafts={drafts} places={names} onReview={openDraft} />
    </>
  );
}

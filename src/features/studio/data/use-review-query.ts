import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { listDrafts } from './drafts';
import { fetchPublicationState } from './publication';
import { runReviewCommand } from './review-commands';
import { fetchReviewComparison } from './review-comparison';
import { reviewKeys } from './review-keys';
import { reviewPlaceNames } from './review-names';
import type { DraftRow } from './review-schema';

export function useReviewQuery() {
  return useQuery({ queryKey: reviewKeys.drafts(), queryFn: listDrafts });
}

export function useReviewMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: runReviewCommand,
    // Even a refusal may mean another editor acted or our earlier answer was lost.
    onSettled: () => client.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

export function usePublicationQuery() {
  return useQuery({ queryKey: reviewKeys.publication(), queryFn: fetchPublicationState });
}

export function useComparisonQuery(draft: DraftRow) {
  return useQuery({
    queryKey: reviewKeys.comparison(draft.id, draft.revision),
    queryFn: () => fetchReviewComparison(draft),
  });
}

export function useReviewNames(drafts: DraftRow[]) {
  const publication = usePublicationQuery();
  const subjects = publication.data?.subjects;
  return useMemo(() => reviewPlaceNames(drafts, subjects ?? []), [drafts, subjects]);
}

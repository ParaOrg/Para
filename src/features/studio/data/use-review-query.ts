import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { refreshDraftBase } from './draft-base';
import { listDrafts, putBack, takeDown } from './drafts';
import { fetchPublicationState, type PublicationSubject } from './publication';
import { runReviewCommand } from './review-commands';
import { reviewKeys } from './review-keys';
import { reviewPlaceNames } from './review-names';
import type { DraftRow } from './review-schema';

/** Every draft. `isEnabled` false reads nothing: studio search signed out has no drafts to show. */
export function useReviewQuery({ isEnabled = true }: { isEnabled?: boolean } = {}) {
  return useQuery({ queryKey: reviewKeys.drafts(), queryFn: listDrafts, enabled: isEnabled });
}

export function useReviewMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: runReviewCommand,
    // Even a refusal may mean another editor acted or our earlier answer was lost.
    onSettled: () => client.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

/** Keep my draft: the stale draft moved onto the approved revision now (draft-base.ts). */
export function useKeepDraftMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ kept, revision }: { kept: DraftRow; revision: number }) =>
      refreshDraftBase(kept, revision),
    onSettled: () => client.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

/** Take down an approved route or place, or put a taken-down one back; the lists read again. */
export function useSubjectStatusMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (subject: PublicationSubject) =>
      subject.status === 'approved'
        ? takeDown(subject.kind, subject.id)
        : putBack(subject.kind, subject.id),
    onSettled: () => client.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

export function usePublicationQuery() {
  return useQuery({ queryKey: reviewKeys.publication(), queryFn: fetchPublicationState });
}

export function useReviewNames(drafts: DraftRow[]) {
  const publication = usePublicationQuery();
  const subjects = publication.data?.subjects;
  return useMemo(() => reviewPlaceNames(drafts, subjects ?? []), [drafts, subjects]);
}

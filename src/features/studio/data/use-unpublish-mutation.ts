import { useMutation, useQueryClient } from '@tanstack/react-query';

import { unpublish } from './drafts';
import { reviewKeys } from './review-keys';
import type { DraftKind } from './review-schema';

/** What Unpublish takes off the public map at the next publish. */
interface UnpublishTarget {
  kind: DraftKind;
  subjectId: string;
}

/**
 * Unpublish a route or hotspot (drafts.ts unpublish): it answers `unpublished`
 * with the draft it left, `not_published`, or `blocked` for a hotspot that ends
 * a published route. Every review read is made stale either way, the drafts,
 * a subject's draft and the edit stamps among them: even a refusal may mean
 * another editor acted. The map's own lists are the caller's to read again.
 */
export function useUnpublishMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, subjectId }: UnpublishTarget) => unpublish(kind, subjectId),
    onSettled: () => client.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

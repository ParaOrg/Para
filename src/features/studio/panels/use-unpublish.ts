import { useMutation, useQueryClient } from '@tanstack/react-query';

import { draftRefusal } from '../data/draft-save';
import { takeDown } from '../data/drafts';
import { reviewKeys } from '../data/review-keys';
import type { DraftKind } from '../data/review-schema';

interface UseUnpublishOptions {
  /** What the sidebar is showing: a route or a hotspot. */
  kind: DraftKind;
  /** The published route or hotspot; null when there is none to unpublish. */
  subjectId: string | null;
  /** It came off: it leaves the map, and the drawing ends. */
  onUnpublished?: () => void;
}

/**
 * The sidebar's Unpublish: takes a published route or hotspot off the public map at the next
 * publish, asking first. Today's take-down, as Drafts' Take down runs it (review-subjects.tsx),
 * until the database's unpublish also leaves it a draft (.scratch/codebase-review/database.md).
 * Every review read is stale after it.
 */
export function useUnpublish({ kind, subjectId, onUnpublished }: UseUnpublishOptions) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const refusal = draftRefusal(await takeDown(kind, id));
      if (refusal) throw new Error(refusal);
    },
    onSuccess: () => onUnpublished?.(),
    onSettled: () => client.invalidateQueries({ queryKey: reviewKeys.all }),
  });

  const unpublish = (name: string) => {
    if (!subjectId) return;
    if (!window.confirm(`Unpublish "${name}"? It leaves the public map at the next publish.`))
      return;
    mutation.mutate(subjectId);
  };

  return {
    isBusy: mutation.isPending,
    error: mutation.error ? mutation.error.message : null,
    unpublish,
  };
}

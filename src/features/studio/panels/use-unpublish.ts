import { useMutation, useQueryClient } from '@tanstack/react-query';

import { draftRefusal } from '../data/draft-save';
import { takeDown } from '../data/drafts';
import { reviewKeys } from '../data/review-keys';

interface UseUnpublishOptions {
  /** The published route the sidebar is showing; null when there is none to unpublish. */
  routeId: string | null;
  /** The route came off: its line leaves the map, and the drawing ends. */
  onUnpublished?: () => void;
}

/**
 * The sidebar's Unpublish: takes a published route off the public map at the next publish,
 * asking first. Today's take-down, as Drafts' Take down runs it (review-subjects.tsx), until the
 * database's unpublish also leaves it a draft (.scratch/codebase-review/database.md). Every
 * review read is stale after it.
 */
export function useUnpublish({ routeId, onUnpublished }: UseUnpublishOptions) {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (id: string) => {
      const refusal = draftRefusal(await takeDown('route', id));
      if (refusal) throw new Error(refusal);
    },
    onSuccess: () => onUnpublished?.(),
    onSettled: () => client.invalidateQueries({ queryKey: reviewKeys.all }),
  });

  const unpublish = (name: string) => {
    if (!routeId) return;
    if (!window.confirm(`Unpublish "${name}"? It leaves the public map at the next publish.`))
      return;
    mutation.mutate(routeId);
  };

  return {
    isBusy: mutation.isPending,
    error: mutation.error ? mutation.error.message : null,
    unpublish,
  };
}

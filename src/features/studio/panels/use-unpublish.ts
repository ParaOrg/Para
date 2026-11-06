import { draftRefusal } from '../data/draft-save';
import { reviewMessage } from '../data/review-commands';
import type { DraftKind, ReviewResult } from '../data/review-schema';
import { useUnpublishMutation } from '../data/use-unpublish-mutation';

interface UseUnpublishOptions {
  /** What the sidebar is showing: a route or a hotspot. */
  kind: DraftKind;
  /** The published route or hotspot; null when there is none to unpublish. */
  subjectId: string | null;
  /** It came off: it leaves the map, and the drawing ends. */
  onUnpublished?: () => void;
}

/** Why an Unpublish took nothing off, in the editor's words; null when it did. */
function unpublishRefusal(result: ReviewResult): string | null {
  if (result.code === 'unpublished') return null;
  // A hotspot that ends a published route: the sidebar's words name the route ending there.
  if (result.code === 'blocked') return draftRefusal(result);
  return reviewMessage(result);
}

/**
 * The sidebar's Unpublish: takes a published route or hotspot off the public map at the next
 * publish, asking first, and leaves it a draft (useUnpublishMutation).
 */
export function useUnpublish({ kind, subjectId, onUnpublished }: UseUnpublishOptions) {
  const mutation = useUnpublishMutation();

  const unpublish = (name: string) => {
    if (!subjectId) return;
    if (!window.confirm(`Unpublish "${name}"? It leaves the public map at the next publish.`))
      return;
    mutation.mutate(
      { kind, subjectId },
      {
        onSuccess: (result) => {
          if (result.code === 'unpublished') onUnpublished?.();
        },
      },
    );
  };

  const refusal = mutation.data ? unpublishRefusal(mutation.data) : null;
  return {
    isBusy: mutation.isPending,
    error: mutation.error ? mutation.error.message : refusal,
    unpublish,
  };
}

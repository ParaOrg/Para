import { useQuery } from '@tanstack/react-query';

import { useStudioSession } from '../auth/use-studio-session';
import { isAnothersDraft } from '../data/draft-lock';
import { draftOf } from '../data/drafts';
import { reviewMessage, type ReviewAction } from '../data/review-commands';
import { reviewKeys } from '../data/review-keys';
import type { DraftKind, DraftRow } from '../data/review-schema';
import { useReviewMutation } from '../data/use-review-query';

interface UseStoredDraftOptions {
  kind: DraftKind;
  /** The route or hotspot the sidebar shows; null for one never saved. */
  subjectId: string | null;
  /** Whether the form or the line changed since the sidebar opened; none, on a card. */
  isChanged?: boolean;
  /** The form's own Publish: saves what is on screen as the draft, then publishes it. */
  publishForm?: () => void;
  /** It was approved as stored: the map has changed, and the drawing ends. */
  onApproved?: () => void;
  /** It was discarded: what is published stands as it was, and the drawing ends. */
  onDiscarded?: () => void;
}

const DISCARD_QUESTION = 'Discard this draft? What is published stays as it is.';

/**
 * The draft kept for the sidebar's route or hotspot, read under the key its Edit opened it by,
 * and what the footer does with it. Approve, with nothing changed on screen, publishes the draft
 * at the revision read (publish_draft's check refuses one saved since); changed, it is the form's
 * Publish, which saves first. Discard drops it, the maker's own only. `footer` is SaveFooter's.
 */
export function useStoredDraft({
  kind,
  subjectId,
  isChanged = false,
  publishForm,
  onApproved,
  onDiscarded,
}: UseStoredDraftOptions) {
  const userId = useStudioSession()?.user.id ?? null;
  const query = useQuery({
    queryKey: reviewKeys.draftOf(kind, subjectId ?? ''),
    queryFn: () => draftOf(kind, subjectId ?? ''),
    enabled: subjectId !== null,
  });
  const mutation = useReviewMutation();
  const draft: DraftRow | null = subjectId === null ? null : (query.data ?? null);
  const isOwn = draft !== null && userId !== null && !isAnothersDraft(draft, userId);

  const run = (action: ReviewAction) => {
    if (!draft || mutation.isPending) return;
    if (action === 'discard' && !window.confirm(DISCARD_QUESTION)) return;
    mutation.mutate(
      { action, draft },
      {
        onSuccess: (result) => {
          if (result.code === 'approved') onApproved?.();
          if (result.code === 'discarded') onDiscarded?.();
        },
      },
    );
  };

  const result = mutation.data;
  const refusal =
    result && result.code !== 'approved' && result.code !== 'discarded'
      ? reviewMessage(result)
      : null;
  const approve = () => run('publish');
  return {
    /** Approve, the stored draft as it is: what a card offers on another editor's draft. */
    approve,
    isApproving: mutation.isPending && mutation.variables.action === 'publish',
    /** Why Approve or Discard did nothing, in the editor's words; null when nothing failed. */
    error: mutation.error ? mutation.error.message : refusal,
    footer: {
      hasDraft: draft !== null,
      draftBusy: mutation.isPending ? mutation.variables.action : null,
      onPublish: (draft && !isChanged) || !publishForm ? approve : publishForm,
      onDiscard: isOwn && onDiscarded ? () => run('discard') : undefined,
    },
  };
}

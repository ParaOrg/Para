import { useQuery } from '@tanstack/react-query';

import { useStudioSession } from '../auth/use-studio-session';
import { isAnothersDraft } from '../data/draft-lock';
import { draftOf } from '../data/drafts';
import { reviewMessage, type ReviewAction } from '../data/review-commands';
import { reviewKeys } from '../data/review-keys';
import type { DraftKind, DraftRow } from '../data/review-schema';
import { useKeepDraftMutation, useReviewMutation } from '../data/use-review-query';

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
/** Said once Keep my draft has moved the draft onto the approved revision now. */
export const KEPT = 'Draft kept on the latest published version. Approve it again when ready.';
const KEEP_QUESTION =
  'Keep your draft as it is? Approving it then replaces the changes another editor published since.';

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
  const keeping = useKeepDraftMutation();
  const draft: DraftRow | null = subjectId === null ? null : (query.data ?? null);
  const isOwn = draft !== null && userId !== null && !isAnothersDraft(draft, userId);

  const run = (action: ReviewAction) => {
    if (!draft || mutation.isPending) return;
    if (action === 'discard' && !window.confirm(DISCARD_QUESTION)) return;
    // Awaited, not mutate's own onSuccess: approving or discarding a draft with no approved row
    // re-reads the drafts, and the sidebar showing it is replaced before a per-call onSuccess
    // would run (TanStack Query drops those once the caller unmounts).
    mutation.mutateAsync({ action, draft }).then(
      (result) => {
        if (result.code === 'approved') onApproved?.();
        if (result.code === 'discarded') onDiscarded?.();
      },
      // A failure is the mutation's error, which the sidebar shows (DraftAlert).
      () => undefined,
    );
  };

  const result = mutation.data;
  const refusal =
    result && result.code !== 'approved' && result.code !== 'discarded'
      ? reviewMessage(result)
      : null;
  const approve = () => run('publish');
  // An approval refused as stale names the approved revision now: the maker may keep the draft
  // on it (refresh_draft_base) and approve again.
  const conflictRevision =
    result?.code === 'conflict' && isOwn ? result.current_revision : undefined;
  const keep = () => {
    if (!draft || conflictRevision === undefined || keeping.isPending) return;
    if (!window.confirm(KEEP_QUESTION)) return;
    keeping.mutate(
      { kept: draft, revision: conflictRevision },
      { onSuccess: (answer) => answer.code === 'ok' && mutation.reset() },
    );
  };
  const keptAnswer = keeping.data;
  return {
    /** Keep my draft beside a conflict on the editor's own draft, and what it did (DraftAlert). */
    keeping: {
      onKeep: conflictRevision !== undefined ? keep : undefined,
      isKeeping: keeping.isPending,
      keepNotice: keeping.error
        ? keeping.error.message
        : keptAnswer
          ? keptAnswer.code === 'ok'
            ? KEPT
            : reviewMessage(keptAnswer)
          : null,
    },
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

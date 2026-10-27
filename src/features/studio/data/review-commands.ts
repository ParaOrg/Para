import { approveDraft, discardDraft, submitDraft } from './drafts';
import type { DraftRow, ReviewResult } from './review-schema';

export type ReviewAction = 'discard' | 'approve';

export interface ReviewCommand {
  action: ReviewAction;
  draft: DraftRow;
}

/**
 * Every operation carries the draft revision the editor actually read. The
 * database approves only a submitted draft, so Approve submits first and then
 * approves the revision submitting gave it: one press, still the revision on
 * screen. A refusal after the submit leaves the draft submitted, and Approve
 * on it again goes straight to approval.
 */
export async function runReviewCommand({ action, draft }: ReviewCommand): Promise<ReviewResult> {
  if (action === 'discard') return discardDraft(draft.id, draft.revision);
  if (draft.status === 'pending') return approveDraft(draft.id, draft.revision);
  const submitted = await submitDraft(draft.id, draft.revision);
  if (submitted.code !== 'submitted' || !submitted.draft) return submitted;
  return approveDraft(submitted.draft.id, submitted.draft.revision);
}

/** A missing draft is ambiguous after a lost answer, so it is never called approved. */
export function reviewMessage(result: ReviewResult): string {
  switch (result.code) {
    case 'approved':
      return 'Approved. The Studio map shows it now; the public map changes at the next publish.';
    case 'discarded':
      return 'Draft discarded. Approved data is unchanged.';
    case 'conflict':
      return 'Approved data changed since this draft began. Refresh and compare before making a new draft.';
    case 'revision_mismatch':
      return 'Someone changed this draft. Refresh it before acting again.';
    case 'no_draft':
      return 'This draft is no longer available. Refresh to check its current state.';
    case 'already_pending':
    case 'not_pending':
      return 'Someone else acted on this draft meanwhile. Refresh it before trying again.';
    case 'ends_taken':
      return 'Another approved route already uses these ends and via. Change them in the draft’s details below, or discard this draft.';
    case 'loop_taken':
      return 'An approved loop already uses this signboard and via. Change them in the draft’s details below, or discard this draft.';
    case 'terminal_place_taken':
      return 'An approved terminal already uses this place. Review that terminal before trying again.';
    case 'bad_payload':
    case 'payload_incomplete':
      return 'The draft is incomplete. Nothing was approved. Discard it and draw it again.';
    case 'subject_gone':
      return 'The original route or place no longer exists. Discard this draft and create it again.';
    case 'subject_exists':
      return 'This route or place already exists. Refresh and review its current version.';
    case 'blocked':
      return 'A related place or route prevents this change. Review its dependencies first.';
    case 'direction_clash':
    case 'direction_elsewhere':
      return 'The draft has conflicting directions. Discard it and draw it again.';
    case 'busy':
      return 'Another change is in progress. Refresh before trying again.';
    default:
      return `The operation was refused (${result.code}). Refresh before trying again.`;
  }
}

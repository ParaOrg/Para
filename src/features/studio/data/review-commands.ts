import * as z from 'zod/mini';

import { approveDraft, discardDraft, sendBackDraft, submitDraft } from './drafts';
import type { DraftRow, ReviewResult } from './review-schema';

export type ReviewAction = 'submit' | 'send-back' | 'discard' | 'approve';

export interface ReviewCommand {
  action: ReviewAction;
  draft: DraftRow;
  note?: string;
}

const noteSchema = z.string().check(z.trim(), z.minLength(1), z.maxLength(4000));

/** Every operation carries the draft revision the editor actually read. */
export async function runReviewCommand(command: ReviewCommand): Promise<ReviewResult> {
  const { action, draft } = command;
  if (action === 'discard') return discardDraft(draft.id, draft.revision);
  if (action === 'submit') {
    if (draft.status !== 'draft') throw new Error('Refresh this draft before submitting it.');
    return submitDraft(draft.id, draft.revision);
  }
  if (draft.status !== 'pending') throw new Error('This draft is not waiting for review.');
  if (action === 'approve') return approveDraft(draft.id, draft.revision);
  const note = noteSchema.safeParse(command.note);
  if (!note.success) throw new Error('Add a reason between 1 and 4,000 characters.');
  return sendBackDraft(draft.id, draft.revision, note.data);
}

/** A missing draft is ambiguous after a lost answer, so it is never called approved. */
export function reviewMessage(result: ReviewResult): string {
  switch (result.code) {
    case 'approved':
      return 'Approved. Waiting for publication; the public map is unchanged until then.';
    case 'submitted':
      return 'Submitted for review. The public map is unchanged.';
    case 'sent_back':
      return 'Sent back with your note.';
    case 'discarded':
      return 'Draft discarded. Approved data is unchanged.';
    case 'conflict':
      return 'Approved data changed since this draft began. Refresh and compare before making a new draft.';
    case 'revision_mismatch':
      return 'Someone changed this draft. Refresh it before acting again.';
    case 'no_draft':
      return 'This draft is no longer available. Refresh to check its current state.';
    case 'already_pending':
      return 'This draft is already waiting for review.';
    case 'not_pending':
      return 'This draft is no longer waiting for review. Refresh it.';
    case 'ends_taken':
      return 'Another approved route already uses these ends and via. Send this draft back to change them.';
    case 'loop_taken':
      return 'An approved loop already uses this signboard and via. Send this draft back to change them.';
    case 'terminal_place_taken':
      return 'An approved terminal already uses this place. Review that terminal before trying again.';
    case 'bad_payload':
    case 'payload_incomplete':
      return 'The draft is incomplete. Nothing was approved. Send it back to fix its drawing or links.';
    case 'subject_gone':
      return 'The original route or place no longer exists. Discard this draft and create it again.';
    case 'subject_exists':
      return 'This route or place already exists. Refresh and review its current version.';
    case 'blocked':
      return 'A related place or route prevents this change. Review its dependencies first.';
    case 'direction_clash':
    case 'direction_elsewhere':
      return 'The draft has conflicting directions. Send it back to correct the drawing.';
    case 'busy':
      return 'Another change is in progress. Refresh before trying again.';
    default:
      return `The operation was refused (${result.code}). Refresh before trying again.`;
  }
}

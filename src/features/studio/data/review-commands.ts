import { discardDraft, publishDraft } from './drafts';
import type { DraftRow, ReviewResult } from './review-schema';

export type ReviewAction = 'discard' | 'publish';

export interface ReviewCommand {
  action: ReviewAction;
  draft: DraftRow;
}

/**
 * Every operation carries the draft revision the editor actually read, so
 * Publish publishes the draft on screen and nothing saved since.
 */
export async function runReviewCommand({ action, draft }: ReviewCommand): Promise<ReviewResult> {
  if (action === 'discard') return discardDraft(draft.id, draft.revision);
  return publishDraft(draft.id, draft.revision);
}

/** A missing draft is ambiguous after a lost answer, so it is never called approved. */
export function reviewMessage(result: ReviewResult): string {
  switch (result.code) {
    case 'approved':
      return 'Published. The Studio map shows it now; the public map changes at the next publish.';
    case 'discarded':
      return 'Draft discarded. Published data is unchanged.';
    case 'conflict':
      return 'Published data changed since this draft began. Refresh and compare before making a new draft.';
    case 'revision_mismatch':
      return 'Someone changed this draft. Refresh it before acting again.';
    case 'no_draft':
      return 'This draft is no longer available. Refresh to check its current state.';
    case 'not_your_draft':
      return 'Only the editor who made this draft can discard it. Nothing was changed.';
    case 'ends_taken':
      return 'Another approved route already uses these ends and via. Change them in the draft’s details below, or discard this draft.';
    case 'loop_taken':
      return 'An approved loop already uses this signboard and via. Change them in the draft’s details below, or discard this draft.';
    case 'terminal_place_taken':
      return 'An approved terminal already uses this place. Review that terminal before trying again.';
    case 'bad_payload':
    case 'payload_incomplete':
      return 'The draft is incomplete. Nothing was published. Discard it and draw it again.';
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
    case 'ok':
      return 'Saved as a draft.';
    case 'unpublished':
      return 'Unpublished. It is a draft again; the public map changes at the next publish.';
    case 'not_published':
      return 'This is not published any more, so there is nothing to unpublish. Refresh to check its current state.';
    case 'taken_down':
    case 'put_back':
      return 'Updated published data. Waiting for the next publish.';
    case 'not_approved':
      return 'This is not approved any more, so there is nothing to take down. Refresh to check its current state.';
    case 'not_taken_down':
      return 'This is not taken down any more, so there is nothing to put back. Refresh to check its current state.';
    case 'refused':
      return 'Nothing was changed. Refresh and try again.';
  }
}

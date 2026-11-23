import { assertNotAnothersDraft } from './draft-guard';
import { callReview } from './drafts';
import type { DraftRow, ReviewResult } from './review-schema';

/**
 * Keep my draft, on a stale draft (an approval answered `conflict`): the draft keeps its whole
 * contents and moves its base to the route's or hotspot's approved revision now, so it can be
 * approved again. That approval then replaces what another editor approved since. The maker's own
 * draft only, as for every change to a draft (draft_update_own).
 */
export async function refreshDraftBase(
  draft: DraftRow,
  currentRevision: number,
): Promise<ReviewResult> {
  await assertNotAnothersDraft(draft);
  return callReview('refresh_draft_base', {
    p_draft: draft.id,
    p_revision: draft.revision,
    p_base_revision: currentRevision,
  });
}

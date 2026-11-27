import type { useSavedHotspots } from '@/features/routes/map/use-saved-hotspots';
import type { useSavedRoutes } from '@/features/routes/map/use-saved-routes';
import { hotspotLabel, type HotspotRow } from '@/features/routes/model/hotspots';
import { isLoop, LOOP_WORD, type DirectionRow } from '@/features/routes/model/routes';

import { endsRefusal } from './hotspot-in-use';
import { assertNotAnothersDraft } from '../data/draft-guard';
import { deleteDirectionDraft, draftRefusal, DRAFTED } from '../data/draft-save';
import { draftOf, takeDown } from '../data/drafts';
import { reviewMessage, runReviewCommand } from '../data/review-commands';

interface DeleteActionsOptions {
  signedIn: boolean;
  /** Signed out, a delete asks for sign-in instead. */
  onSignInNeeded: () => void;
  saved: Pick<ReturnType<typeof useSavedRoutes<DirectionRow>>, 'directions' | 'select' | 'reload'>;
  hotspots: Pick<ReturnType<typeof useSavedHotspots<HotspotRow>>, 'select' | 'reload'>;
  setNotice: (text: string | null) => void;
}

/**
 * Delete on a trip's card and on a hotspot's: who may, what is refused and
 * what is said. Each confirms first, then writes, closes the card and reloads;
 * a failure is a notice. A hotspot comes off the map by take-down, which Put
 * back undoes. A trip's delete is approved at once. If the editor already has
 * a draft of the route, the confirm says its unapproved changes are discarded,
 * and on OK the draft is discarded before the delete, so the delete is the
 * only change approved; Cancel changes nothing. Another editor's draft refuses
 * the delete. If the approval is refused, the removal draft stays stored and
 * the notice says why.
 */
export function useDeleteActions({
  signedIn,
  onSignInNeeded,
  saved,
  hotspots,
  setNotice,
}: DeleteActionsOptions) {
  const onDeleteHotspot = async (s: HotspotRow) => {
    // As Done does: signed out, the take-down would go out on the publishable
    // key and be refused. Asking for sign-in first lets it go through.
    if (!signedIn) {
      onSignInNeeded();
      return;
    }
    // A route's end cannot go while the route names it (endsRefusal).
    const refusal = endsRefusal(s, saved.directions);
    if (refusal) {
      setNotice(refusal);
      return;
    }
    if (!window.confirm(`Take down ${s.kind} "${hotspotLabel(s)}"?`)) return;
    try {
      await assertNotAnothersDraft(await draftOf('hotspot', s.id));
      const refusal = draftRefusal(await takeDown('hotspot', s.id));
      if (refusal) throw new Error(refusal);
      hotspots.select(null);
      await hotspots.reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };

  const onDelete = async (v: DirectionRow) => {
    // Signed out, the draft would be refused; ask for sign-in first (onDeleteHotspot).
    if (!signedIn) {
      onSignInNeeded();
      return;
    }
    try {
      const ownDraft = await draftOf('route', v.routeId);
      await assertNotAnothersDraft(ownDraft);
      const name = v.route?.name;
      const target = isLoop(v)
        ? `the ${LOOP_WORD.toLowerCase()} "${name}"`
        : `"${name}" — ${v.name}`;
      const confirmation = ownDraft
        ? `Delete "${name}"? Your unapproved changes to this route will be discarded.`
        : `Delete ${target}?`;
      if (!window.confirm(confirmation)) return;
      if (ownDraft) {
        const discarded = await runReviewCommand({ action: 'discard', draft: ownDraft });
        if (discarded.code !== 'discarded') throw new Error(reviewMessage(discarded));
      }
      const stored = await deleteDirectionDraft(v);
      const refusal = draftRefusal(stored);
      if (refusal) throw new Error(refusal);
      saved.select(null);
      // The delete is the draft's only change: approved in the same press, so it is gone
      // and not parked in a draft, where Discard would undo it.
      const approved =
        stored.draft && (await runReviewCommand({ action: 'publish', draft: stored.draft }));
      if (approved?.code === 'approved') {
        await saved.reload();
        return;
      }
      setNotice(approved ? reviewMessage(approved) : DRAFTED);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e));
    }
  };

  return { onDelete, onDeleteHotspot };
}

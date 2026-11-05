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

/** What a delete says when it joined a draft the editor already had of the route. */
function addedToDraft(v: DirectionRow): string {
  return `Added to your draft of "${v.route?.name ?? 'this route'}". Review it in Drafts: the map changes once it is approved.`;
}

/**
 * Delete on a trip's card and on a hotspot's: who may, what is refused and
 * what is said. Each confirms first, then writes, closes the card and reloads;
 * a failure is a notice. A hotspot comes off the map by take-down, which Put
 * back undoes. A trip's delete is approved at once
 * when it is the route draft's only change; if the editor already had a draft
 * of the route, the delete joins it unapproved. If the approval is refused, the
 * removal draft stays in Drafts and the notice says why.
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
    const confirmation = isLoop(v)
      ? `Delete the ${LOOP_WORD.toLowerCase()} "${v.route?.name}"?`
      : `Delete "${v.route?.name}" — ${v.name}?`;
    if (!window.confirm(confirmation)) return;
    try {
      // Read before the delete is stored: once it is, a draft exists either way.
      const hasDraftAlready = (await draftOf('route', v.routeId)) !== null;
      const stored = await deleteDirectionDraft(v);
      const refusal = draftRefusal(stored);
      if (refusal) throw new Error(refusal);
      saved.select(null);
      // The confirm reviewed the delete and nothing else. A draft the editor already
      // had holds changes nobody has reviewed, and approving it would publish them with
      // the delete, so the delete joins that draft and waits in Drafts with the rest.
      if (hasDraftAlready) {
        setNotice(addedToDraft(v));
        return;
      }
      // The delete is the draft's only change: approved in the same press, so it is gone
      // and not parked in Drafts, where Discard would undo it.
      const approved =
        stored.draft && (await runReviewCommand({ action: 'approve', draft: stored.draft }));
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

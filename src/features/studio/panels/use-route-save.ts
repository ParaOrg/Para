import { useRef, useState } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';

import { NOT_PUBLISHED, type SaveIntent } from './save-intent';
import type { useSaveFacts } from './use-save-facts';
import { draftRefusal, saveRouteDraft } from '../data/draft-save';
import { reviewMessage } from '../data/review-commands';
import type { SaveInput } from '../data/route-save-input';
import { useReviewMutation } from '../data/use-review-query';
import type { Drawing } from '../drawing/use-drawing';

/** What the save panel's form contributes to a save; the line and its borrow come from the drawing. */
type RouteSaveForm = Pick<
  SaveInput,
  | 'routeId'
  | 'directionId'
  | 'writeRoute'
  | 'signboard'
  | 'mode'
  | 'fareNote'
  | 'headHotspotId'
  | 'tailHotspotId'
  | 'isLoop'
  | 'via'
>;

interface UseRouteSaveOptions {
  facts: Pick<
    ReturnType<typeof useSaveFacts>,
    'borrowedForSave' | 'borrowParent' | 'borrowPart' | 'reversed'
  >;
  draw: Pick<Drawing, 'controlPoints' | 'segments'>;
  hotspots: HotspotRow[];
  /** Hears the direction the draft holds, for what was made from it. The map is unchanged until approval. */
  onDrafted?: (directionId: string) => void;
  /** Hears the direction a publish made published: the map has changed. */
  onPublished?: (directionId: string) => void;
}

/**
 * The save panel's save, stored as a draft and, for Publish, approved in the same press: busy
 * with what was asked while it runs, its error as text.
 */
export function useRouteSave({
  facts,
  draw,
  hotspots,
  onDrafted,
  onPublished,
}: UseRouteSaveOptions) {
  // The save under way, by what was asked of it: the footer names it on its button.
  const [busy, setBusy] = useState<SaveIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A new route's id for its draft, the same on every retry: a claim whose
  // answer was lost then updates that draft instead of making a second one.
  const newRouteId = useRef<string | null>(null);
  const review = useReviewMutation();

  async function save(form: RouteSaveForm, intent: SaveIntent) {
    setBusy(intent);
    setError(null);
    try {
      // The borrow on the parent's full line, read now if it has not come.
      const borrowed = await facts.borrowedForSave();
      const input: SaveInput = {
        ...form,
        reversed: facts.reversed,
        controlPoints: draw.controlPoints,
        segments: draw.segments,
        // A parent deleted since, or a borrowed part redrawn away, borrows nothing.
        borrowedFrom: facts.borrowParent && borrowed > 0 ? facts.borrowParent.id : null,
        borrowedPart: facts.borrowPart,
        borrowedMetres: borrowed > 0 ? Math.round(borrowed) : null,
      };
      newRouteId.current ??= crypto.randomUUID();
      const { result, directionId } = await saveRouteDraft(input, hotspots, newRouteId.current);
      const refusal = draftRefusal(result);
      if (refusal) throw new Error(refusal);
      // Publish is the draft save and then its approval, in one press, until the database
      // publishes a draft in one call (.scratch/codebase-review/database.md).
      if (intent === 'publish') {
        // Without the draft's row there is nothing to approve: never call that published.
        if (!result.draft) throw new Error(NOT_PUBLISHED);
        const published = await review.mutateAsync({ action: 'approve', draft: result.draft });
        if (published.code !== 'approved')
          throw new Error(`${NOT_PUBLISHED} ${reviewMessage(published)}`);
        if (onPublished) onPublished(directionId);
        else setBusy(null);
        return;
      }
      if (onDrafted) onDrafted(directionId);
      else setBusy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Only on failure: a save that succeeds closes the panel.
      setBusy(null);
    }
  }

  return { busy, error, setError, save };
}

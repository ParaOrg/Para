import { useRef, useState } from 'react';

import { hotspotRefusal, type HotspotCheck } from './hotspot-checks';
import type { SaveIntent } from './use-route-save';
import { draftRefusal, saveHotspotDraft } from '../data/draft-save';
import type { SaveHotspotInput } from '../data/hotspot-save-input';
import { reviewMessage } from '../data/review-commands';
import { useReviewMutation } from '../data/use-review-query';

/** A publish that stopped after the draft save (useRouteSave's NOT_PUBLISHED). */
const NOT_PUBLISHED =
  'Saved as a draft, not published. To publish it, open Drafts and approve it there.';

interface UseHotspotSaveOptions {
  /** Hears the hotspot the draft holds, for what was made from it. The map is unchanged until approval. */
  onDrafted?: (hotspotId: string) => void;
  /** Hears the hotspot a publish made published: the map has changed. */
  onPublished?: (hotspotId: string) => void;
}

/**
 * The hotspot panel's save: the refusals first (hotspotRefusal), then the draft and, for Publish,
 * its approval in the same press; busy with what was asked while it runs, its error in the
 * panel's words.
 */
export function useHotspotSave({ onDrafted, onPublished }: UseHotspotSaveOptions) {
  const [busy, setBusy] = useState<SaveIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  // A new hotspot's id for its draft, the same on every retry (useRouteSave's newRouteId).
  const newHotspotId = useRef<string | null>(null);
  const review = useReviewMutation();

  /** Saves the form, `check` the refusal's view of it, `input` what is written. */
  async function submit(
    intent: SaveIntent,
    check: HotspotCheck,
    input: Omit<SaveHotspotInput, 'hotspotId'>,
  ) {
    setError(null);
    const refusal = hotspotRefusal(check);
    if (refusal) {
      setError(refusal);
      return;
    }
    setBusy(intent);
    try {
      newHotspotId.current ??= crypto.randomUUID();
      const { result, hotspotId } = await saveHotspotDraft(
        { hotspotId: check.hotspotId, ...input },
        newHotspotId.current,
      );
      const refusal = draftRefusal(result);
      if (refusal) throw new Error(refusal);
      // Publish is the draft save and then its approval, in one press, until the database
      // publishes a draft in one call (.scratch/codebase-review/database.md).
      if (intent === 'publish') {
        if (!result.draft) throw new Error(NOT_PUBLISHED);
        const published = await review.mutateAsync({ action: 'approve', draft: result.draft });
        if (published.code !== 'approved')
          throw new Error(`${NOT_PUBLISHED} ${reviewMessage(published)}`);
        if (onPublished) onPublished(hotspotId);
        else setBusy(null);
        return;
      }
      if (onDrafted) onDrafted(hotspotId);
      else setBusy(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(null);
    }
  }

  return { busy, error, setError, submit };
}

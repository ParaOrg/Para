import { useRef, useState } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import type { useSaveFacts } from './use-save-facts';
import { draftRefusal, saveRouteDraft } from '../data/draft-save';
import { STUDIO_DRAFTS } from '../data/flags';
import { reviewMessage } from '../data/review-commands';
import type { SaveInput } from '../data/routes-write';
import { saveRouteAndLinks } from '../data/save-route';
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

/**
 * What the sidebar's footer asked for: Save as draft keeps the change to editors; Publish makes
 * it what commuters get at the next publish. With STUDIO_DRAFTS off every save is a publish.
 */
export type SaveIntent = 'draft' | 'publish';

/**
 * A publish that stopped after the draft save. The approval submits first, so a refusal after
 * it leaves the draft waiting in Drafts, where its Approve finishes the publish.
 */
const NOT_PUBLISHED =
  'Saved as a draft, not published. To publish it, open Drafts and approve it there.';

/** The direction a save wrote, by its route's id and its own. */
interface WrittenDirection {
  routeId: string;
  directionId: string;
}

interface UseRouteSaveOptions {
  facts: Pick<
    ReturnType<typeof useSaveFacts>,
    'borrowedForSave' | 'borrowParent' | 'borrowPart' | 'reversed'
  >;
  draw: Pick<Drawing, 'controlPoints' | 'segments'>;
  hotspots: HotspotRow[];
  onSaved: (direction: DirectionRow) => void;
  /** With STUDIO_DRAFTS on: the save is a draft, and the map is unchanged. */
  /** Hears the direction the draft holds, for what was made from it. */
  onDrafted?: (directionId: string) => void;
  /** With STUDIO_DRAFTS on: the draft was published, so the map has changed. */
  onPublished?: (directionId: string) => void;
}

/**
 * The save panel's save: busy while it runs, its error as text, and the row
 * it wrote when the link sync after it failed.
 */
export function useRouteSave({
  facts,
  draw,
  hotspots,
  onSaved,
  onDrafted,
  onPublished,
}: UseRouteSaveOptions) {
  // The save under way, by what was asked of it: the footer names it on its button.
  const [busy, setBusy] = useState<SaveIntent | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The direction as a save wrote it, when the link sync after it failed.
  // Saves are two steps, so a second press must update the row already written:
  // inserting the route again would meet its own row and be refused as "already drawn".
  // TODO: one RPC per save would make this one transaction (saves are not transactional today).
  const [written, setWritten] = useState<WrittenDirection | null>(null);

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
      if (STUDIO_DRAFTS) {
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
        return;
      }
      const named = await saveRouteAndLinks(input, hotspots, setWritten);
      onSaved(named);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Only on failure: a save that succeeds closes the panel.
      setBusy(null);
    }
  }

  return { busy, error, setError, written, save };
}

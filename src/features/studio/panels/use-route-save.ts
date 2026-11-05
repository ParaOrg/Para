import { useRef, useState } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';

import type { useSaveFacts } from './use-save-facts';
import { draftRefusal, saveRouteDraft } from '../data/draft-save';
import type { SaveInput } from '../data/route-save-input';
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
}

/** The save panel's save, stored as a draft: busy while it runs, its error as text. */
export function useRouteSave({ facts, draw, hotspots, onDrafted }: UseRouteSaveOptions) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new route's id for its draft, the same on every retry: a claim whose
  // answer was lost then updates that draft instead of making a second one.
  const newRouteId = useRef<string | null>(null);

  async function save(form: RouteSaveForm) {
    setBusy(true);
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
      if (onDrafted) onDrafted(directionId);
      else setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      // Only on failure: a save that succeeds closes the panel.
      setBusy(false);
    }
  }

  return { busy, error, setError, save };
}

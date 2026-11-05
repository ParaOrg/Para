import { useState } from 'react';

import { draftRefusal } from '../data/draft-save';
import { takeDown } from '../data/drafts';

interface UseUnpublishOptions {
  /** The published route the sidebar is showing. */
  routeId: string | null;
  /** The route came off: its line leaves the map, and the drawing ends. */
  onUnpublished?: () => void;
}

/**
 * The sidebar's Unpublish: takes a published route off the public map at the next publish,
 * asking first. Today's take-down, until the database's unpublish also leaves it a draft
 * (.scratch/codebase-review/database.md); busy while it runs, its refusal in words.
 */
export function useUnpublish({ routeId, onUnpublished }: UseUnpublishOptions) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unpublish(routeName: string) {
    if (!routeId) return;
    if (!window.confirm(`Unpublish "${routeName}"? It leaves the public map at the next publish.`))
      return;
    setIsBusy(true);
    setError(null);
    try {
      const refusal = draftRefusal(await takeDown('route', routeId));
      if (refusal) throw new Error(refusal);
      if (onUnpublished) onUnpublished();
      else setIsBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setIsBusy(false);
    }
  }

  return { isBusy, error, unpublish };
}

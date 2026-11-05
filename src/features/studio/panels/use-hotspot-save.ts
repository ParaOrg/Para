import { useRef, useState, type FormEvent } from 'react';

import { hotspotRefusal, type HotspotCheck } from './hotspot-checks';
import { draftRefusal, saveHotspotDraft } from '../data/draft-save';
import type { SaveHotspotInput } from '../data/hotspot-save-input';

interface UseHotspotSaveOptions {
  /** Hears the hotspot the draft holds, for what was made from it. The map is unchanged until approval. */
  onDrafted?: (hotspotId: string) => void;
}

/**
 * The hotspot panel's save: the refusals first (hotspotRefusal), then the
 * draft, busy while it runs, its error in the panel's words.
 */
export function useHotspotSave({ onDrafted }: UseHotspotSaveOptions) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A new hotspot's id for its draft, the same on every retry (useRouteSave's newRouteId).
  const newHotspotId = useRef<string | null>(null);

  /** Saves the form, `check` the refusal's view of it, `input` what is written. */
  async function submit(
    e: FormEvent,
    check: HotspotCheck,
    input: Omit<SaveHotspotInput, 'hotspotId'>,
  ) {
    e.preventDefault();
    setError(null);
    const refusal = hotspotRefusal(check);
    if (refusal) {
      setError(refusal);
      return;
    }
    setBusy(true);
    try {
      newHotspotId.current ??= crypto.randomUUID();
      const { result, hotspotId } = await saveHotspotDraft(
        { hotspotId: check.hotspotId, ...input },
        newHotspotId.current,
      );
      const refusal = draftRefusal(result);
      if (refusal) throw new Error(refusal);
      if (onDrafted) onDrafted(hotspotId);
      else setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return { busy, error, setError, submit };
}

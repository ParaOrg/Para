import { useRef, useState, type FormEvent } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';

import { hotspotRefusal, type HotspotCheck } from './hotspot-checks';
import { draftRefusal, saveHotspotDraft } from '../data/draft-save';
import { STUDIO_DRAFTS } from '../data/flags';
import { saveHotspot } from '../data/hotspots-write';

/** What a save writes: saveHotspot's input. */
type SaveHotspotInput = Parameters<typeof saveHotspot>[0];

interface UseHotspotSaveOptions {
  onSaved: (s: HotspotRow) => void;
  /** Hears the row a save wrote, the moment it is in, to keep it beyond the panel. */
  onWritten?: (hotspotId: string) => void;
  /** With STUDIO_DRAFTS on: the save is a draft, and the map is unchanged. */
  onDrafted?: () => void;
}

/**
 * The hotspot panel's save: the refusals first (hotspotRefusal), then the
 * write, busy while it runs, its error in the panel's words.
 */
export function useHotspotSave({ onSaved, onWritten, onDrafted }: UseHotspotSaveOptions) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The row as a save wrote it, when its links failed after: the retry
  // updates it rather than inserting the box again (SavePanel's `written`).
  // The studio keeps it in the outline itself (onWritten, adoptHotspot), so ✕
  // and a reload keep it too; here otherwise, as in the stories.
  const [writtenId, setOwnWritten] = useState<string | null>(null);
  const setWrittenId = (id: string) => {
    setOwnWritten(id);
    onWritten?.(id);
  };

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
      if (STUDIO_DRAFTS) {
        newHotspotId.current ??= crypto.randomUUID();
        const { result } = await saveHotspotDraft(
          { hotspotId: check.hotspotId, ...input },
          newHotspotId.current,
        );
        const refusal = draftRefusal(result);
        if (refusal) throw new Error(refusal);
        if (onDrafted) onDrafted();
        else setBusy(false);
        return;
      }
      const saved = await saveHotspot({ hotspotId: check.hotspotId, ...input }, setWrittenId);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  }

  return { busy, error, setError, writtenId, submit };
}

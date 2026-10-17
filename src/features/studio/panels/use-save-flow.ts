import { useState } from 'react';

import type { HotspotRow } from '@/features/routes/model/hotspots';
import type { DirectionRow } from '@/features/routes/model/routes';

import type { SaveToast } from './save-toasts';

interface UseSaveFlowOptions {
  /** A reset link's problem, read once on arrival: the first toast, if any. */
  recoveryError: string | null;
  /** Ends the drawing that was saved. */
  cancelDrawing: () => void;
  /** Reads the saved routes again. */
  reloadRoutes: () => unknown;
  /** Reads the saved hotspots again. */
  reloadHotspots: () => unknown;
}

/**
 * The workshop's save: whether a save panel is open, and the toast, one at a
 * time, the newest: a save's, or a problem. A save closes its panel, ends the
 * drawing, reads what it changed again and says so.
 */
export function useSaveFlow({
  recoveryError,
  cancelDrawing,
  reloadRoutes,
  reloadHotspots,
}: UseSaveFlowOptions) {
  const [isSaving, setIsSaving] = useState(false);
  // A rejected reset link (expired, already used) is the first toast: just a
  // notice, since the user is plainly signed out and can ask for another. The
  // link is read once, on arrival, so its error is known before this mounts
  // and never comes later.
  const [toast, setToast] = useState<SaveToast | null>(() =>
    recoveryError ? { kind: 'notice', text: `Reset link problem: ${recoveryError}` } : null,
  );
  const setNotice = (text: string | null) =>
    setToast(text === null ? null : { kind: 'notice', text });

  const onSaved = (v: DirectionRow) => {
    setIsSaving(false);
    cancelDrawing();
    void reloadRoutes();
    // A moved line may have entered or left a hintuan; its links were re-synced.
    void reloadHotspots();
    setToast({ kind: 'route', v });
  };

  const onSavedHotspot = (s: HotspotRow) => {
    setIsSaving(false);
    cancelDrawing();
    void reloadHotspots();
    // The directions too: their names are generated from the hotspots at
    // their ends when they load, so a renamed end would leave every card, the
    // list and the pill on the old name until the next route save.
    void reloadRoutes();
    setToast({ kind: 'hotspot', s });
  };

  return {
    isSaving,
    setIsSaving,
    toast,
    setToast,
    setNotice,
    /** The direction a save just wrote, while its toast is up. */
    justSaved: toast?.kind === 'route' ? toast.v : null,
    onSaved,
    onSavedHotspot,
  };
}

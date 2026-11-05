import { useState } from 'react';

import type { SaveToast } from './save-toasts';
import { DRAFTED } from '../data/draft-save';
import { reviewMessage } from '../data/review-commands';

interface UseSaveFlowOptions {
  /** Whether a line or an area is being drawn: a save panel belongs to one. */
  isDrawing: boolean;
  /** A reset link's problem, read once on arrival: the first toast, if any. */
  recoveryError: string | null;
  /** Ends the drawing that was saved. */
  cancelDrawing: () => void;
  /** Reads the saved routes again, once a publish has changed them. */
  reloadRoutes: () => unknown;
  /** Reads the saved hotspots again, once a publish has changed them. */
  reloadHotspots: () => unknown;
}

/**
 * The workshop's save: whether a save panel is open, and the toast, one at a
 * time, the newest: a save's, or a problem. A save closes its panel, ends the
 * drawing, reads what it changed again and says so.
 */
export function useSaveFlow({
  isDrawing,
  recoveryError,
  cancelDrawing,
  reloadRoutes,
  reloadHotspots,
}: UseSaveFlowOptions) {
  const [isSaving, setIsSaving] = useState(false);
  // A drawing that ends with its panel open takes the panel with it, or the
  // next drawing would open on a save form with no points.
  if (isSaving && !isDrawing) setIsSaving(false);
  // A rejected reset link (expired, already used) is the first toast: just a
  // notice, since the user is plainly signed out and can ask for another. The
  // link is read once, on arrival, so its error is known before this mounts
  // and never comes later.
  const [toast, setToast] = useState<SaveToast | null>(() =>
    recoveryError ? { kind: 'notice', text: `Reset link problem: ${recoveryError}` } : null,
  );
  const setNotice = (text: string | null) =>
    setToast(text === null ? null : { kind: 'notice', text });

  // A save is a draft, so nothing on the map is read again.
  const onDrafted = () => {
    setIsSaving(false);
    cancelDrawing();
    setNotice(DRAFTED);
  };

  // A draft published: the map's own rows changed, so both are read again.
  const onPublished = () => {
    setIsSaving(false);
    cancelDrawing();
    void reloadRoutes();
    void reloadHotspots();
    setNotice(reviewMessage({ code: 'approved' }));
  };

  return {
    isSaving,
    setIsSaving,
    toast,
    setToast,
    setNotice,
    /** The direction a save just wrote, while its toast is up. */
    justSaved: toast?.kind === 'route' ? toast.v : null,
    onDrafted,
    onPublished,
  };
}

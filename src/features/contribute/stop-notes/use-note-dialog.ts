import { useEffect, type RefObject } from 'react';

import { useDialogFocus } from '@/shared/hooks/use-dialog-focus';
import { useEscape } from '@/shared/hooks/use-escape';
import { useTabLoop } from '@/shared/hooks/use-tab-loop';

/**
 * A note's dialog holding the keyboard: its field has focus as it opens, so the phone's keyboard
 * comes up with the end of what is written; Tab goes round its field and buttons; Escape calls
 * `onEscape`; and focus goes back where it was as it closes (useDialogFocus).
 */
export function useNoteDialog(dialogRef: RefObject<HTMLElement | null>, onEscape: () => void) {
  useDialogFocus(dialogRef, false);
  useEscape(onEscape);

  // After useDialogFocus has noted where focus was.
  useEffect(() => {
    const field = dialogRef.current?.querySelector('textarea');
    if (!field) return;
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  }, [dialogRef]);

  useTabLoop(dialogRef, 'textarea, button');
}

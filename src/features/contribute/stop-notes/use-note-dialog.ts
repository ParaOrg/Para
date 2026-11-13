import { useEffect, type RefObject } from 'react';

import { useDialogFocus } from '@/shared/hooks/use-dialog-focus';
import { useEscape } from '@/shared/hooks/use-escape';

/**
 * A note's dialog holding the keyboard: its field has focus as it opens, so the phone's keyboard
 * comes up with the end of what is written; Tab goes round its field and buttons; Escape is
 * Cancel; and focus goes back where it was as it closes (useDialogFocus).
 */
export function useNoteDialog(dialogRef: RefObject<HTMLElement | null>, onCancel: () => void) {
  useDialogFocus(dialogRef, false);
  useEscape(onCancel);

  // After useDialogFocus has noted where focus was.
  useEffect(() => {
    const field = dialogRef.current?.querySelector('textarea');
    if (!field) return;
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  }, [dialogRef]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const stops = [...dialog.querySelectorAll<HTMLElement>('textarea, button')];
      const first = stops.at(0);
      const last = stops.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [dialogRef]);
}

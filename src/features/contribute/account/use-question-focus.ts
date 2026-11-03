import { useEffect, type RefObject } from 'react';

import { useEscape } from '@/shared/hooks/use-escape';

import { useHoldToolbar } from '../toolbar/toolbar-hold';

/**
 * Focus for a question before an act that ends something (HandQuestion): the safe answer, drawn
 * last, has it as the question opens, and Tab goes round the buttons that can be
 * pressed. Escape cancels. Once the answer is under way nothing cancels it: Escape waits, and the
 * question's heading holds focus while both buttons are off, so it never drops out of the dialog.
 * The page's toolbar steps aside while it is open (toolbar-hold.tsx).
 */
export function useQuestionFocus(
  dialogRef: RefObject<HTMLElement | null>,
  headingRef: RefObject<HTMLElement | null>,
  isBusy: boolean,
  onCancel: () => void,
) {
  useHoldToolbar();
  // While the answer is under way it cannot be taken back: Cancel would only hide that it goes on.
  useEscape(onCancel, !isBusy);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // The safe answer is drawn last (HandQuestion): Cancel, or "No, I change my mind".
    [...dialog.querySelectorAll('button')].at(-1)?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const buttons = [...dialog.querySelectorAll('button')].filter((button) => !button.disabled);
      // Busy, both buttons wait: focus stays on the question's heading.
      if (buttons.length === 0) {
        e.preventDefault();
        return;
      }
      const first = buttons.at(0);
      const last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) {
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

  // The answer turns off as it is pressed, which would drop focus out of the dialog: the
  // question's heading holds it until the answer comes.
  useEffect(() => {
    if (isBusy) headingRef.current?.focus();
  }, [isBusy, headingRef]);
}

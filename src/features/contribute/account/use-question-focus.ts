import { useEffect, type RefObject } from 'react';

import { useEscape } from '@/shared/hooks/use-escape';

/**
 * Focus for a question before an act that ends something (QuestionSheet, LogoutConfirm): Cancel,
 * the safe answer, has it as the question opens, and Tab goes round the buttons that can be
 * pressed. Escape cancels. Once the answer is under way nothing cancels it: Escape waits, and the
 * question's heading holds focus while both buttons are off, so it never drops out of the dialog.
 */
export function useQuestionFocus(
  dialogRef: RefObject<HTMLElement | null>,
  headingRef: RefObject<HTMLElement | null>,
  isBusy: boolean,
  onCancel: () => void,
) {
  // While the answer is under way it cannot be taken back: Cancel would only hide that it goes on.
  useEscape(onCancel, !isBusy);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    [...dialog.querySelectorAll('button')]
      .find((button) => button.textContent === 'Cancel')
      ?.focus();
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

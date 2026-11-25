import { useEffect, type RefObject } from 'react';

import { useBackLayer } from '@/shared/hooks/use-back-layer';
import { useEscape } from '@/shared/hooks/use-escape';
import { useTabLoop } from '@/shared/hooks/use-tab-loop';

import { useHoldToolbar } from '../toolbar/toolbar-hold';

/**
 * Focus for a question before an act that ends something (HandQuestion): the safe answer (marked
 * `data-safe-answer`) has it as the question opens, and Tab goes round the buttons that can be
 * pressed. Escape and the phone's Back cancel. Once the answer is under way nothing cancels it:
 * they wait, and the question's heading holds focus while both buttons are off, so it never drops
 * out of the dialog. The page's toolbar steps aside while it is open (toolbar-hold.tsx).
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
  useBackLayer(true, () => {
    if (!isBusy) onCancel();
  });

  useEffect(() => {
    // Cancel, "No, I change my mind" or Keep recording, wherever HandQuestion draws it.
    dialogRef.current?.querySelector<HTMLButtonElement>('[data-safe-answer]')?.focus();
  }, [dialogRef]);
  // Busy, both buttons wait: with no stop left, focus stays on the question's heading.
  useTabLoop(dialogRef, 'button:not(:disabled)');

  // The answer turns off as it is pressed, which would drop focus out of the dialog: the
  // question's heading holds it until the answer comes.
  useEffect(() => {
    if (isBusy) headingRef.current?.focus();
  }, [isBusy, headingRef]);
}

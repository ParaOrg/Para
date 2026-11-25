import { useEffect, type RefObject } from 'react';

/**
 * Tab goes round inside a dialog: from its last stop (`stops`, a selector) to its first and back.
 * With no stop to go to (every button off while an answer is under way), Tab stays where it is.
 * `isActive` false leaves Tab alone, for a dialog leaving or covered by another.
 */
export function useTabLoop(
  dialogRef: RefObject<HTMLElement | null>,
  stops: string,
  isActive = true,
): void {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const found = [...dialog.querySelectorAll<HTMLElement>(stops)];
      if (found.length === 0) {
        e.preventDefault();
        return;
      }
      const first = found.at(0);
      const last = found.at(-1);
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
  }, [dialogRef, stops, isActive]);
}

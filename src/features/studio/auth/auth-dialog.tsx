import { useEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';

import { coarse } from '@/features/routes/map/map-view';

interface AuthDialogProps {
  /** The id of the dialog's heading, its accessible name. */
  labelledBy: string;
  /** What Escape does; without it, Escape leaves the dialog open (a sign-in the page needs). */
  onDismiss?: () => void;
  children: ReactNode;
}

/**
 * The studio's sign-in and password panels, as modal dialogs: the page behind
 * is inert, so Tab stays in the panel, and focus goes back to where it was when
 * the panel closes. The panel's look is the one the sign-in always had.
 */
export function AuthDialog({ labelledBy, onDismiss, children }: AuthDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    // showModal focuses the first field, which on touch would open the keyboard unasked:
    // there the dialog itself takes the focus, as the panels' own autoFocus intends.
    if (coarse) dialog.focus();
    return () => {
      // Closed first, so the page behind can take the focus again. Given back only when it is
      // still ours to give: nothing else has claimed it, and the opener is still on the page.
      if (dialog.open) dialog.close();
      const now = document.activeElement;
      if ((now === null || now === document.body || dialog.contains(now)) && opener?.isConnected)
        opener.focus({ preventScroll: true });
    };
  }, []);

  // Escape is the dialog's own cancel: the panel decides whether it closes.
  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onDismiss?.();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onCancel={handleCancel}
      className="m-auto w-[calc(100%-3rem)] max-w-sm rounded-xl bg-white p-6 shadow-xl outline-none backdrop:bg-black/30"
    >
      {children}
    </dialog>
  );
}

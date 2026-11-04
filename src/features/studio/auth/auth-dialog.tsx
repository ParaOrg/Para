import { useEffect, useRef, type ReactNode, type SyntheticEvent } from 'react';

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
    return () => {
      dialog.close();
      opener?.focus();
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
      onCancel={handleCancel}
      className="m-auto w-[calc(100%-3rem)] max-w-sm rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/30"
    >
      {children}
    </dialog>
  );
}

import { useEffect, useId, useRef } from 'react';

interface NotEditorProps {
  /** Back to the studio's sign-in. */
  onSignInAgain: () => void;
}

/**
 * Over the studio when an account that is not on the editor list signed in:
 * it has already been signed out of the studio, and is pointed to the
 * contributor page, where it stays signed in. The sign-in panel's look, as a
 * modal dialog: the page behind is inert, and Escape signs in again.
 */
export function NotEditor({ onSignInAgain }: NotEditorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const headingId = useId();
  const textId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    // The notice replaces what the person was looking at: a screen reader starts at its heading.
    headingRef.current?.focus();
    return () => dialog.close();
  }, []);

  const handleCancel = (event: React.SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    onSignInAgain();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      aria-describedby={textId}
      onCancel={handleCancel}
      className="m-auto w-[calc(100%-3rem)] max-w-sm rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/30"
    >
      <h2
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        className="text-base font-medium text-neutral-900 outline-none"
      >
        This account isn&apos;t an editor
      </h2>
      <p id={textId} className="mt-2 text-sm text-neutral-600">
        Para Studio is for the people who draw the routes. You signed in with a contributor account,
        so you can&apos;t make changes here.
      </p>
      <div className="mt-5 flex flex-col gap-2">
        <a
          href="/contribute/"
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-center text-sm font-medium text-white"
        >
          Open the contributor page
        </a>
        <button
          type="button"
          onClick={onSignInAgain}
          className="rounded-lg px-4 py-2.5 text-sm font-medium text-neutral-600 ring-1 ring-neutral-300"
        >
          Sign in with another account
        </button>
      </div>
    </dialog>
  );
}

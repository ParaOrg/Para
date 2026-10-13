import { useEffect, useId, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';

import welcome from './install-welcome.webp';

interface InstallPromptProps {
  /** Install: the browser's own install dialog (installApp). */
  onInstall: () => void;
  /** "I'll do it later", or Escape: gone until the next visit. */
  onLater: () => void;
}

/**
 * The owner's welcome to a visitor who has not installed Para Po (Figma
 * 3732:2512, 2026-10-13): the page dimmed in Background/surface-transparent,
 * and over it, 16 in from the sides and centred, a card at most 384 wide —
 * its picture, then "Welcome to Para Po", a line under it, and two buttons
 * sharing the row, "I'll do it later" (Secondary) and Install (Primary). The
 * same card on a phone and a wide screen; only its width gives.
 *
 * A modal <dialog>: the page behind it is out of reach, the focus is kept
 * inside it, and Escape is "later" (the browser's own, so a screen reader
 * hears a dialog). The line under the title reads "Your almost…" in Figma;
 * here it is "You're almost…", the owner's pick (2026-10-13). The picture
 * is his, cropped to what the card shows and kept small for a first visit
 * (48 kB).
 */
export function InstallPrompt({ onInstall, onLater }: InstallPromptProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const lineId = useId();

  // Shown as a modal from the start; the browser drops it with the element.
  // The focus goes to the dialog itself, not its first button, as the cards
  // take it (useDialogFocus): nothing is pressed by accident, and no focus
  // ring stands on "later" before anyone has touched it. Gone, it gives the
  // focus back where it was, as the cards do: an unmounted dialog does not.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const before = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    dialog.focus();
    return () => {
      // Closed first, so the page behind can take the focus again (and
      // StrictMode's rehearsal opens it afresh). Only when the focus is still
      // ours to give back.
      if (dialog.open) dialog.close();
      const now = document.activeElement;
      if ((now === null || now === document.body || dialog.contains(now)) && before?.isConnected)
        before.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      data-testid="install-prompt"
      aria-labelledby={titleId}
      aria-describedby={lineId}
      tabIndex={-1}
      onCancel={(event) => {
        event.preventDefault();
        onLater();
      }}
      className="m-0 size-full max-h-none max-w-none items-center justify-center bg-surface-transparent p-4 outline-none backdrop:bg-transparent open:flex"
    >
      <div className="w-full max-w-96 overflow-clip rounded-3xl bg-surface font-sn-pro">
        <img
          src={welcome}
          alt=""
          width={768}
          height={403}
          className="block aspect-[320/168] h-auto w-full object-cover"
        />
        <div className="flex flex-col gap-6 p-5">
          <div className="flex flex-col gap-1">
            <h2 id={titleId} className="text-xl/7 font-black text-content-primary">
              Welcome to Para Po
            </h2>
            <p id={lineId} className="text-sm/5 text-content-tertiary">
              You’re almost a good commute guide application in the Philippines
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" label="I’ll do it later" onClick={onLater} />
            <Button variant="primary" label="Install" onClick={onInstall} />
          </div>
        </div>
      </div>
    </dialog>
  );
}

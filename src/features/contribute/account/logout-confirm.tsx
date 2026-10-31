import { useId, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';

import raisedHand from './raised-hand.svg';
import { useQuestionFocus } from './use-question-focus';

interface LogoutConfirmProps {
  /** Saved recordings not yet sent: they stay on this phone, unsent, after logging out. */
  unsentCount: number;
  isLoggingOut: boolean;
  /** One line about a Logout that failed, or null: said here, where the contributor is. */
  error: string | null;
  onLogout: () => void;
  /** Cancel or Escape; neither while logging out. */
  onCancel: () => void;
}

/**
 * The question before Logout (Figma 4521:3500): the page frosted over, a raised hand, the
 * question, and Logout above Cancel. Focus starts on Cancel and goes round inside it; once Logout
 * is under way nothing cancels it. With recordings not sent yet, one grey line under the question
 * says they stay behind on this phone (the frame draws none yet: the owner is asked).
 */
export function LogoutConfirm({
  unsentCount,
  isLoggingOut,
  error,
  onLogout,
  onCancel,
}: LogoutConfirmProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const textId = useId();
  useQuestionFocus(dialogRef, headingRef, isLoggingOut, onCancel);
  const warning = unsentWarning(unsentCount);

  return (
    <section
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={warning ? textId : undefined}
      className="absolute inset-0 z-50 flex items-center overflow-y-auto bg-surface/80 px-5 py-[max(1.5rem,env(safe-area-inset-top))] font-sn-pro text-content-primary backdrop-blur-md"
    >
      {/* The frame sets the question 40 above the middle: its own margin below, twice that. */}
      <div className="mb-20 flex w-full flex-col gap-12">
        <div className="flex flex-col items-center gap-4">
          <img src={raisedHand} alt="" className="size-20" />
          <div className="flex w-full flex-col gap-2 text-center">
            <h2
              id={titleId}
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl/8 font-semibold focus:outline-none"
            >
              Are you sure you want to logout?
            </h2>
            {warning && (
              <p id={textId} className="text-base/6 text-content-quaternary">
                {warning}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm/5 text-content-error">
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            label={isLoggingOut ? 'Logging out…' : 'Logout'}
            disabled={isLoggingOut}
            onClick={onLogout}
          />
          <Button variant="secondary" label="Cancel" disabled={isLoggingOut} onClick={onCancel} />
        </div>
      </div>
    </section>
  );
}

/** What logging out leaves behind: recordings not sent yet stay on this phone, unsent. */
function unsentWarning(unsentCount: number): string | null {
  if (unsentCount <= 0) return null;
  const noun = unsentCount === 1 ? 'recording' : 'recordings';
  return `${unsentCount} ${noun} not sent yet will be left behind on this phone, unsent.`;
}

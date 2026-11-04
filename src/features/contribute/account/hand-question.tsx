import { useId, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';

import raisedHand from './raised-hand.svg';
import { useQuestionFocus } from './use-question-focus';

/**
 * How the two answers stand. `primary` and `error`: the act leads, in Logout's brand blue or
 * Delete account's red, over a secondary safe answer. `plain-error`: the safe answer leads in brand
 * blue, the act under it in plain red words (Delete this record, 4569:5015).
 */
type HandAnswerLook = 'primary' | 'error' | 'plain-error';

interface HandQuestionProps {
  title: string;
  /** One grey line under the question, or null. */
  text: string | null;
  /** One line about an answer that failed, or null: said here, where the person is. */
  error: string | null;
  /** The answer that goes ahead, and how it looks (`HandAnswerLook`). */
  confirmLabel: string;
  confirmVariant: HandAnswerLook;
  /** The answer's words while it is under way. */
  busyLabel: string;
  /** The safe answer. */
  cancelLabel: string;
  isBusy: boolean;
  onConfirm: () => void;
  /** The safe answer or Escape; neither while the answer is under way. */
  onCancel: () => void;
}

/**
 * The question before an act that ends something, over the frosted page (Logout, 4521:3500;
 * Delete account, 4543:5154): a raised hand, the question and a grey line, then the answer above
 * the safe one, or under it (`plain-error`). Focus starts on the safe answer and goes round inside; once the answer is under
 * way nothing cancels it.
 */
export function HandQuestion({
  title,
  text,
  error,
  confirmLabel,
  confirmVariant,
  busyLabel,
  cancelLabel,
  isBusy,
  onConfirm,
  onCancel,
}: HandQuestionProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const textId = useId();
  useQuestionFocus(dialogRef, headingRef, isBusy, onCancel);

  return (
    <section
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={text ? textId : undefined}
      className="absolute inset-0 z-50 flex items-center overflow-y-auto bg-surface/80 px-5 py-[max(1.5rem,env(safe-area-inset-top))] font-sn-pro text-content-primary backdrop-blur-md"
    >
      {/* The frames set the question 40 above the middle: its own margin below, twice that. */}
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
              {title}
            </h2>
            {text && (
              <p id={textId} className="text-base/6 text-content-quaternary">
                {text}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm/5 text-content-error">
                {error}
              </p>
            )}
          </div>
        </div>
        {confirmVariant === 'plain-error' ? (
          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              label={cancelLabel}
              disabled={isBusy}
              onClick={onCancel}
              data-safe-answer
            />
            <Button
              variant="plain"
              tone="error"
              label={isBusy ? busyLabel : confirmLabel}
              disabled={isBusy}
              onClick={onConfirm}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Button
              variant={confirmVariant}
              label={isBusy ? busyLabel : confirmLabel}
              disabled={isBusy}
              onClick={onConfirm}
            />
            <Button
              variant="secondary"
              label={cancelLabel}
              disabled={isBusy}
              onClick={onCancel}
              data-safe-answer
            />
          </div>
        )}
      </div>
    </section>
  );
}

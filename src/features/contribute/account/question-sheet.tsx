import { useId, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';

import { useQuestionFocus } from './use-question-focus';

interface QuestionSheetProps {
  title: string;
  /** What the answer does: said under the question, and read with it. */
  text: string;
  /** The answer that acts (Delete account), in Content/error: it ends something. */
  confirmLabel: string;
  /** Its words while it is under way (Deleting…). */
  busyLabel: string;
  isBusy: boolean;
  /** One line about a try that failed, or null: said here, where the contributor is. */
  error: string | null;
  onConfirm: () => void;
  /** Cancel, Escape, or a tap on the dimmed page; none of them while the answer is under way. */
  onCancel: () => void;
}

/**
 * A question before an act that ends something (Delete account), in the app's sheet look
 * (the Map Data Source sheet's): a sheet over the page dimmed in Background/surface-transparent.
 * Focus starts on Cancel, the safe answer, and goes round inside it. Once the answer is under
 * way, nothing cancels it: Cancel, Escape and the dimmed page wait, and the answer says it is busy.
 */
export function QuestionSheet({
  title,
  text,
  confirmLabel,
  busyLabel,
  isBusy,
  error,
  onConfirm,
  onCancel,
}: QuestionSheetProps) {
  const sheetRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const titleId = useId();
  const textId = useId();
  useQuestionFocus(sheetRef, headingRef, isBusy, onCancel);

  return (
    <>
      {/* The dimmed page: a tap on it cancels. Hidden from screen readers, who have the sheet's own
          Cancel. */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={isBusy ? undefined : onCancel}
        className="absolute inset-0 z-40 cursor-default bg-surface-transparent"
      />
      <section
        ref={sheetRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={textId}
        className="absolute inset-x-0 bottom-0 z-50 flex max-h-dvh flex-col gap-4 overflow-y-auto rounded-t-4xl bg-surface px-4 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] font-sn-pro text-content-primary shadow-bottom-sheet-top-shadow"
      >
        <h2
          id={titleId}
          ref={headingRef}
          tabIndex={-1}
          className="text-lg/7 font-bold focus:outline-none"
        >
          {title}
        </h2>
        <p id={textId} className="text-base/6 text-content-quaternary">
          {text}
        </p>
        {error && (
          <p role="alert" className="text-sm/5 text-content-error">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3">
          <Button
            variant="error"
            label={isBusy ? busyLabel : confirmLabel}
            disabled={isBusy}
            onClick={onConfirm}
          />
          <Button variant="secondary" label="Cancel" disabled={isBusy} onClick={onCancel} />
        </div>
      </section>
    </>
  );
}

import type { Ref } from 'react';

interface DiscardRecordingButtonProps {
  onClick: () => void;
  /** Focus comes back here when Discard's question is answered Keep it. */
  buttonRef: Ref<HTMLButtonElement>;
}

/**
 * The save form's Discard recording. Figma's Button in its plain voice, its words in
 * Content/error: the design system's Button has no plain red, so the same box and type, in tokens.
 */
export function DiscardRecordingButton({ onClick, buttonRef }: DiscardRecordingButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      className="flex items-center justify-center rounded-full px-4 py-2 text-base/6 font-medium text-content-error outline-none focus-visible:ring-2 focus-visible:ring-content-error"
    >
      Discard recording
    </button>
  );
}

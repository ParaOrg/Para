import type { Ref } from 'react';

import { FlagStopIcon } from '../common/flag-stop-icon';
import { ArrowRightIcon } from '../common/history-icons';

interface StopNotesEntryProps {
  /** How many stops the ride has flagged; nothing shows for none. */
  count: number;
  onOpen: () => void;
  buttonRef?: Ref<HTMLButtonElement>;
}

/**
 * The save form's way into Stops notes: the flag, "Stops notes" and how many stops were flagged.
 * Figma draws no entry on the form; it stands in the form's own field look until it does.
 */
export function StopNotesEntry({ count, onOpen, buttonRef }: StopNotesEntryProps) {
  if (count === 0) return null;
  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-2 rounded-2xl border border-border-secondary p-3 text-left text-content-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-surface active:bg-surface-secondary"
    >
      <span aria-hidden className="size-5 shrink-0 *:size-full">
        <FlagStopIcon />
      </span>
      <span className="min-w-0 flex-1 text-base/6 font-medium">Stops notes</span>
      <span className="text-sm/5 text-content-quaternary">
        {count} {count === 1 ? 'stop' : 'stops'}
      </span>
      <span aria-hidden className="size-5 shrink-0 text-content-quaternary *:size-full">
        <ArrowRightIcon />
      </span>
    </button>
  );
}

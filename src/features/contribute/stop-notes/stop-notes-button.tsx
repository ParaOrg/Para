import { useId, type Ref } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';

import { NoteIcon } from './stop-note-icons';

export interface StopNotesButtonProps {
  /** How many stops the ride has flagged: the badge's number. */
  count: number;
  onOpen: () => void;
  /** Focus comes back here as Stops notes closes. */
  buttonRef?: Ref<HTMLButtonElement>;
}

/**
 * Figma's Stops notes button (4718:3923): the Special Large IconButton with the Note icon, over
 * Flag a stop once the ride has a flag, and an Indicator at its top right counting the flags.
 */
export function StopNotesButton({ count, onOpen, buttonRef }: StopNotesButtonProps) {
  const countId = useId();
  return (
    // 16 over Flag a stop, as Figma has it: 4 of them the column's own gap.
    <div className="relative mb-3">
      <IconButton
        ref={buttonRef}
        size="large"
        tooltip="left"
        label="Stops notes"
        icon={<NoteIcon />}
        aria-describedby={countId}
        onClick={onOpen}
      />
      <span
        id={countId}
        className="pointer-events-none absolute -top-1 -right-1 flex size-5 items-center justify-center rounded-full bg-surface-inverse font-sn-pro text-xs/4 font-medium text-content-inverse"
      >
        {count}
        <span className="sr-only"> {count === 1 ? 'stop' : 'stops'} flagged</span>
      </span>
    </div>
  );
}

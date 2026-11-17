import type { Ref } from 'react';

import { FlagStopIcon } from '../common/flag-stop-icon';

interface StopNotesTitleProps {
  id: string;
  /** How many stops the ride has flagged: the chip beside the title, left out at none. */
  count: number;
  headingRef?: Ref<HTMLHeadingElement>;
}

/** "Stops notes" and the flag count (4720:28619), over the stops on the page and on the save form. */
export function StopNotesTitle({ id, count, headingRef }: StopNotesTitleProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2
        id={id}
        ref={headingRef}
        tabIndex={-1}
        className="min-w-0 flex-1 text-2xl/8 font-bold focus:outline-none"
      >
        Stops notes
      </h2>
      {count > 0 && (
        <p className="flex shrink-0 items-center gap-2 rounded-full bg-surface-secondary px-2 py-1 text-base-lower/6 font-semibold">
          <span aria-hidden className="size-5 *:size-full">
            <FlagStopIcon />
          </span>
          {count}
          <span className="sr-only">{count === 1 ? 'stop' : 'stops'} flagged</span>
        </p>
      )}
    </div>
  );
}

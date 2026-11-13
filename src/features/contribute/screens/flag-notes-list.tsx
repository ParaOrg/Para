import { useId, type RefObject } from 'react';

import { FlagStopIcon } from '../common/flag-stop-icon';
import { clockText } from '../common/format';
import type { MarkRow } from '../storage/recording-schema';

interface FlagNotesListProps {
  marks: readonly MarkRow[];
  listRef: RefObject<HTMLUListElement | null>;
  /** A row tapped: its flag's note opens, by the flag's place among the ride's. */
  onOpen: (index: number) => void;
}

/**
 * The save form's flagged stops, each with its time and its note, or Add a note: a tap opens the
 * note's sheet. Every note can be written here, so the Stop flagged toast's button, which goes
 * with the toast, is never the only way. Nothing shows for a ride with no flags.
 */
export function FlagNotesList({ marks, listRef, onOpen }: FlagNotesListProps) {
  const headingId = useId();
  if (marks.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h2 id={headingId} className="text-base/6 font-medium text-content-primary">
        Flagged stops
      </h2>
      <ul ref={listRef} className="flex flex-col gap-2">
        {marks.map((mark, index) => (
          <li key={mark.time}>
            <button
              type="button"
              onClick={() => onOpen(index)}
              className="flex w-full items-start gap-3 rounded-2xl border border-border-secondary p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand-surface active:bg-surface-secondary"
            >
              <span aria-hidden className="size-6 shrink-0 *:size-full">
                <FlagStopIcon />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm/5 font-medium text-content-primary">
                  Stop {index + 1} · {clockText(mark.time)}
                </span>
                <span className="text-sm/5 break-words text-content-secondary">
                  {mark.note ?? 'Add a note'}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

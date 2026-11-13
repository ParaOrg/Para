import { useId } from 'react';

import { FlagStopIcon } from '../common/flag-stop-icon';
import { clockText } from '../common/format';
import type { MarkRow } from '../storage/recording-schema';

interface RideFlagNotesProps {
  marks: readonly MarkRow[];
}

/**
 * The ride's flagged stops, read only: each with its time and the note written on it, if any.
 * Left out for a ride with no flags.
 */
export function RideFlagNotes({ marks }: RideFlagNotesProps) {
  const headingId = useId();
  if (marks.length === 0) return null;
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2.5">
      <h2 id={headingId} className="text-xl/7 font-semibold">
        Flagged stops
      </h2>
      <ul className="flex flex-col gap-2.5 text-sm/5">
        {marks.map((mark, index) => (
          <li key={mark.time} className="flex gap-2">
            <span aria-hidden className="size-5 shrink-0 text-content-quaternary *:size-full">
              <FlagStopIcon />
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-medium text-content-quaternary">
                Stop {index + 1} · {clockText(mark.time)}
              </span>
              {mark.note && (
                <span className="break-words whitespace-pre-line text-content-tertiary">
                  {mark.note}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

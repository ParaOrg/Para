import { useId, useState } from 'react';
import { flushSync } from 'react-dom';

import { IconButton } from '@/design-system/primitives/icon-button';
import { useEscape } from '@/shared/hooks/use-escape';
import { useFocusHeading } from '@/shared/hooks/use-focus-heading';

import { StopNoteRow } from './stop-note-row';
import type { RailPlace } from './stop-timeline-rail';
import { ArrowLeftIcon } from '../account/arrow-left-icon';
import { HandQuestion } from '../account/hand-question';
import { FlagStopIcon } from '../common/flag-stop-icon';
import type { MarkRow } from '../storage/recording-schema';

interface StopNotesScreenProps {
  /** The ride's flagged stops, in the order they were flagged. */
  marks: readonly MarkRow[];
  /** Each stop's place, in words, in the same order. */
  places: readonly string[];
  /** The back arrow, Escape, or Android's back: closes the page. */
  onBack: () => void;
  /** Absent, the page is read only (History): notes are read, never written or deleted. */
  onNoteMark?: (time: number, note: string) => void;
  onDeleteMark?: (time: number) => void;
}

function railPlaceOf(index: number, count: number): RailPlace {
  if (count === 1) return 'only';
  if (index === 0) return 'first';
  return index === count - 1 ? 'last' : 'middle';
}

/**
 * Figma's Stops notes (4720:28437): the back arrow, the title and how many stops the ride has
 * flagged, then each stop on a timeline with its place, its number and its note. A note is
 * written or changed in place; Delete asks first, then takes the whole flag off the ride.
 */
export function StopNotesScreen({
  marks,
  places,
  onBack,
  onNoteMark,
  onDeleteMark,
}: StopNotesScreenProps) {
  const headingId = useId();
  const headingRef = useFocusHeading();
  const [editingTime, setEditingTime] = useState<number | null>(null);
  const [deletingTime, setDeletingTime] = useState<number | null>(null);
  useEscape(onBack, editingTime === null && deletingTime === null);
  const isEditable = onNoteMark !== undefined && onDeleteMark !== undefined;
  // The question answered, focus comes back to the page's heading: a deleted stop's row is gone.
  const closeQuestion = () => {
    flushSync(() => setDeletingTime(null));
    headingRef.current?.focus();
  };

  return (
    <section
      aria-labelledby={headingId}
      className="absolute inset-0 z-40 flex flex-col overflow-y-auto bg-surface pb-[max(2rem,env(safe-area-inset-bottom))] font-sn-pro text-content-primary"
    >
      <div className="px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-2">
        <IconButton tooltip="bottom" label="Back" icon={<ArrowLeftIcon />} onClick={onBack} />
      </div>
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-2">
        <h2
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          className="min-w-0 flex-1 text-2xl/8 font-bold focus:outline-none"
        >
          Stops notes
        </h2>
        <p className="flex shrink-0 items-center gap-2 rounded-full bg-surface-secondary px-2 py-1 text-base-lower/6 font-semibold">
          <span aria-hidden className="size-5 *:size-full">
            <FlagStopIcon />
          </span>
          {marks.length}
          <span className="sr-only">{marks.length === 1 ? 'stop' : 'stops'} flagged</span>
        </p>
      </div>
      <ol className="flex flex-col">
        {marks.map((mark, index) => (
          <StopNoteRow
            key={mark.time}
            place={places[index] ?? ''}
            stopNumber={index + 1}
            note={mark.note}
            railPlace={railPlaceOf(index, marks.length)}
            isEditing={editingTime === mark.time}
            {...(isEditable && {
              onEdit: () => setEditingTime(mark.time),
              onDelete: () => setDeletingTime(mark.time),
              onCancel: () => setEditingTime(null),
              onSave: (note: string) => {
                onNoteMark(mark.time, note);
                setEditingTime(null);
              },
            })}
          />
        ))}
      </ol>
      {deletingTime !== null && onDeleteMark && (
        <HandQuestion
          title="Delete this stop?"
          text="Its note goes with it."
          error={null}
          confirmLabel="Delete"
          confirmVariant="plain-error"
          busyLabel="Deleting…"
          cancelLabel="Keep"
          isBusy={false}
          onConfirm={() => {
            onDeleteMark(deletingTime);
            closeQuestion();
          }}
          onCancel={closeQuestion}
        />
      )}
    </section>
  );
}

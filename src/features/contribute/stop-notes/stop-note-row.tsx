import { useEffect, useId, useRef, type Ref } from 'react';

import { cn } from '@/shared/utils/cn';

import { NOTE_BOX } from './note-box';
import { StopNoteEditor } from './stop-note-editor';
import { ChevronRightIcon } from './stop-note-icons';
import { StopTimelineRail, type RailPlace } from './stop-timeline-rail';

export interface StopNoteRowProps {
  /** Where the stop is, in words. */
  place: string;
  /** "Stop 1", "Stop 2", in the order the stops were flagged. */
  stopNumber: number;
  note: string | undefined;
  railPlace: RailPlace;
  /** "Stop N ›": the stop on its own map. */
  onOpenMap: () => void;
  /** Its note is being written here: the box is a field, with Cancel and Save. */
  isEditing: boolean;
  /** Absent, the row is read only: its box is not a button, and an empty one says No note. */
  onEdit?: () => void;
  onSave?: (note: string) => void;
  onCancel?: () => void;
}

/**
 * One stop on Figma's Stops notes timeline (4720:28437): the rail and its dot, the stop's place,
 * and "Stop N ›", which opens its map; then its note in a box. A tap on the box writes or changes
 * the note in place, with Cancel and Save under it; with no note, the box says Add note.
 */
export function StopNoteRow({
  place,
  stopNumber,
  note,
  railPlace,
  onOpenMap,
  isEditing,
  onEdit,
  onSave,
  onCancel,
}: StopNoteRowProps) {
  const placeId = useId();
  // Editing done (Save, Cancel or Escape), focus goes back to the note's box that started it: the
  // field it was in is gone.
  const boxRef = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(isEditing);
  useEffect(() => {
    if (wasEditing.current && !isEditing) boxRef.current?.focus();
    wasEditing.current = isEditing;
  }, [isEditing]);

  return (
    <li className="flex gap-2 px-4">
      <StopTimelineRail place={railPlace} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 id={placeId} className="min-w-0 flex-1 text-base/6 font-medium">
            {place}
          </h3>
          <button
            type="button"
            onClick={onOpenMap}
            aria-label={`Stop ${stopNumber} on the map`}
            className="flex shrink-0 items-center gap-1 rounded-full text-sm/5 text-content-quaternary outline-none focus-visible:ring-2 focus-visible:ring-brand-surface"
          >
            Stop {stopNumber}
            <span aria-hidden className="size-5 *:size-full">
              <ChevronRightIcon />
            </span>
          </button>
        </div>
        {isEditing && onSave && onCancel ? (
          <StopNoteEditor
            note={note ?? ''}
            labelledBy={placeId}
            onSave={onSave}
            onCancel={onCancel}
          />
        ) : (
          <NoteBox note={note} boxRef={boxRef} onEdit={onEdit} />
        )}
      </div>
    </li>
  );
}

interface NoteBoxProps {
  note: string | undefined;
  boxRef: Ref<HTMLButtonElement>;
  onEdit?: () => void;
}

/** The note as written, or Add note: a button to write it, or, read only, the words alone. */
function NoteBox({ note, boxRef, onEdit }: NoteBoxProps) {
  const words = note ?? (onEdit ? 'Add note' : 'No note');
  const look = cn(
    NOTE_BOX,
    'break-words whitespace-pre-line',
    note ? 'text-content-primary' : 'text-content-disabled',
  );
  if (!onEdit) return <p className={look}>{words}</p>;
  return (
    <button
      ref={boxRef}
      type="button"
      onClick={onEdit}
      aria-label={note ? `Change the note: ${note}` : 'Add note'}
      className={cn(
        look,
        'flex items-start outline-none focus-visible:ring-2 focus-visible:ring-brand-surface',
      )}
    >
      {words}
    </button>
  );
}

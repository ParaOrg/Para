import { useEffect, useId, useRef } from 'react';

import { Button } from '@/design-system/primitives/button';
import { IconButton } from '@/design-system/primitives/icon-button';
import { cn } from '@/shared/utils/cn';

import { NOTE_BOX } from './note-box';
import { StopNoteEditor } from './stop-note-editor';
import { EditIcon } from './stop-note-icons';
import { StopTimelineRail, type RailPlace } from './stop-timeline-rail';
import { DeleteIcon } from '../common/history-icons';

export interface StopNoteRowProps {
  /** Where the stop is, in words. */
  place: string;
  /** "Stop 1", "Stop 2", in the order the stops were flagged. */
  stopNumber: number;
  note: string | undefined;
  railPlace: RailPlace;
  /** Its note is being written here: the box is a field, with Cancel and Save. */
  isEditing: boolean;
  /** Absent, the row is read only: no Edit, no Delete, and Add note is not offered. */
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: (note: string) => void;
  onCancel?: () => void;
}

/**
 * One stop on Figma's Stops notes timeline (RouteStopsTimeline, 4720:28387): the rail and its dot,
 * the stop's place and number, and its note in a box with Delete and Edit under it; editing, the
 * box is the field and Cancel and Save stand under it (4720:28388); with no note, the box offers
 * Add note (4720:28390).
 */
export function StopNoteRow({
  place,
  stopNumber,
  note,
  railPlace,
  isEditing,
  onEdit,
  onDelete,
  onSave,
  onCancel,
}: StopNoteRowProps) {
  const fieldId = useId();
  const isEditable = onEdit !== undefined;
  // Editing done (Save, Cancel or Escape), focus goes back to the button that started it, Edit or
  // Add note, the last in the row: the field it was in is gone.
  const shownRef = useRef<HTMLDivElement>(null);
  const wasEditing = useRef(isEditing);
  useEffect(() => {
    if (wasEditing.current && !isEditing) {
      [...(shownRef.current?.querySelectorAll('button') ?? [])].at(-1)?.focus();
    }
    wasEditing.current = isEditing;
  }, [isEditing]);
  return (
    <li className="flex gap-2 px-4">
      <StopTimelineRail place={railPlace} />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <h3 id={`${fieldId}-place`} className="min-w-0 flex-1 text-base/6 font-medium">
            {place}
          </h3>
          <span className="shrink-0 text-sm/5 text-content-quaternary">Stop {stopNumber}</span>
        </div>
        {isEditing && onSave && onCancel ? (
          <StopNoteEditor
            note={note ?? ''}
            labelledBy={`${fieldId}-place`}
            onSave={onSave}
            onCancel={onCancel}
          />
        ) : (
          <div ref={shownRef} className="contents">
            <NoteShown note={note} isEditable={isEditable} onEdit={onEdit} onDelete={onDelete} />
          </div>
        )}
      </div>
    </li>
  );
}

interface NoteShownProps {
  note: string | undefined;
  isEditable: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function NoteShown({ note, isEditable, onEdit, onDelete }: NoteShownProps) {
  if (!note && isEditable) {
    return (
      <button
        type="button"
        onClick={onEdit}
        className={cn(NOTE_BOX, 'flex items-start text-content-disabled')}
      >
        Add note
      </button>
    );
  }
  if (!note) return <p className={cn(NOTE_BOX, 'text-content-disabled')}>No note</p>;
  return (
    <>
      <p className={cn(NOTE_BOX, 'break-words whitespace-pre-line text-content-primary')}>{note}</p>
      {isEditable && (
        <div className="flex items-center justify-end gap-2">
          <IconButton
            size="small"
            tooltip="top"
            label="Delete this stop"
            icon={
              <span className="text-content-error *:size-full">
                <DeleteIcon />
              </span>
            }
            onClick={onDelete}
          />
          <Button
            variant="secondary"
            size="small"
            label="Edit"
            firstIcon={<EditIcon />}
            onClick={onEdit}
          />
        </div>
      )}
    </>
  );
}

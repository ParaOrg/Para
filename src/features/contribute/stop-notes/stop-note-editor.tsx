import { useEffect, useRef, useState, type ReactNode } from 'react';

import { CloseIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { NOTE_BOX } from './note-box';
import { CheckIcon } from './stop-note-icons';
import { NOTE_MAX_LENGTH } from '../recorder/recording-marks';

interface StopNoteEditorProps {
  note: string;
  labelledBy: string;
  onSave: (note: string) => void;
  onCancel: () => void;
}

/** A stop's note being written in place: the field, focused, with Cancel and Save under it. */
export function StopNoteEditor({ note, labelledBy, onSave, onCancel }: StopNoteEditorProps) {
  const [text, setText] = useState(note);
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  // The field takes focus as editing starts, the keyboard with it, at the end of what is there.
  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
  }, []);
  return (
    <>
      <textarea
        ref={fieldRef}
        aria-labelledby={labelledBy}
        placeholder="Add note"
        maxLength={NOTE_MAX_LENGTH}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
        className={cn(
          NOTE_BOX,
          'h-25 resize-none text-content-primary outline-none placeholder:text-content-disabled',
        )}
      />
      <div className="flex items-center justify-end gap-2">
        <FlatButton label="Cancel" icon={<CloseIcon />} onClick={onCancel} />
        <FlatButton label="Save" icon={<CheckIcon />} onClick={() => onSave(text)} />
      </div>
    </>
  );
}

interface FlatButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
}

/**
 * Cancel and Save under a note being written: Figma's small Button (4720:28688), its box, icon and
 * words on Background/surface-secondary, flat: only these two drop its effect, so the design
 * system's Button keeps it everywhere else and gains no option for it.
 */
function FlatButton({ label, icon, onClick }: FlatButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 rounded-full bg-surface-secondary px-3 py-1.5 text-sm/5 font-medium text-content-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-surface active:bg-surface-quaternary"
    >
      <span aria-hidden className="size-4 shrink-0 *:size-full">
        {icon}
      </span>
      {label}
    </button>
  );
}

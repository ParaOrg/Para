import { useId, useRef, useState, type ReactNode } from 'react';

import { BLOB_PLACE } from '@/features/routes/cards/livery-card';
import blobPrimary from '@/features/routes/cards/route-card-blob-primary.svg';
import { CloseIcon } from '@/shared/ui/route-icons';
import { cn } from '@/shared/utils/cn';

import { CheckIcon, LocationIcon } from './stop-note-icons';
import { useNoteDialog } from './use-note-dialog';
import { NOTE_MAX_LENGTH } from '../recorder/recording-marks';

export interface StopNoteCardProps {
  /** The stop's note so far: empty for a stop with none. */
  note: string;
  /** Where the stop is, in words: the nearest hotspot Para has. */
  place: string;
  /** Save: the note as typed. */
  onSave: (note: string) => void;
  /** Cancel or Escape: nothing kept. */
  onCancel: () => void;
}

/**
 * Figma's Add a stop note (4709:10936): a card over the dimmed screen, standing over the keyboard,
 * with the note's field, how many of its 200 characters are used, the stop's place, and Cancel
 * and Save side by side at its foot. The recording goes on under it.
 */
export function StopNoteCard({ note, place, onSave, onCancel }: StopNoteCardProps) {
  const dialogRef = useRef<HTMLFormElement>(null);
  const ids = useId();
  const [text, setText] = useState(note);
  useNoteDialog(dialogRef, onCancel);

  return (
    <div className="absolute inset-0 z-50 flex items-center bg-surface-transparent px-4 font-sn-pro">
      <form
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        tabIndex={-1}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSave(text);
        }}
        className="flex w-full flex-col overflow-clip rounded-4xl bg-surface outline-none"
      >
        <h2 id={`${ids}-title`} className="px-4 pt-4 pb-2 text-base-lower/6 font-semibold">
          Add a stop note
        </h2>
        <div className="flex flex-col px-4">
          <textarea
            id={`${ids}-note`}
            aria-labelledby={`${ids}-title`}
            aria-describedby={`${ids}-count`}
            placeholder="Describe what that stop mean for you"
            maxLength={NOTE_MAX_LENGTH}
            value={text}
            onChange={(event) => setText(event.target.value)}
            className="h-25 resize-none bg-transparent text-sm/5 text-content-primary outline-none placeholder:text-content-disabled"
          />
          <p id={`${ids}-count`} className="text-right text-sm/5 text-content-disabled">
            {text.length}/{NOTE_MAX_LENGTH}
          </p>
        </div>
        <p className="flex items-center gap-2 px-4 pt-2 pb-4 text-sm/5 text-content-tertiary">
          <span aria-hidden className="size-5 shrink-0 *:size-full">
            <LocationIcon />
          </span>
          <span className="min-w-0 flex-1">{place}</span>
        </p>
        <div className="flex">
          <CardButton icon={<CloseIcon />} label="Cancel" look="cancel" onClick={onCancel} />
          <CardButton icon={<CheckIcon />} label="Save" look="save" type="submit" />
        </div>
      </form>
    </div>
  );
}

type CardButtonLook = 'cancel' | 'save';

// Figma's TrackingButtonPrimary in the card's own two colours: Cancel on the white surface,
// Save on its green.
const LOOK = {
  cancel: 'rounded-bl-4xl border-border-secondary bg-surface text-content-primary',
  save: 'rounded-br-4xl border-save-border bg-save-surface text-content-inverse',
} satisfies Record<CardButtonLook, string>;

interface CardButtonProps {
  icon: ReactNode;
  label: string;
  look: CardButtonLook;
  type?: 'button' | 'submit';
  onClick?: () => void;
}

/** One of the card's two bars, with the gloss Blob and the RouteCardPrimary press. */
function CardButton({ icon, label, look, type = 'button', onClick }: CardButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'group relative isolate flex flex-1 items-center justify-center gap-1.5 overflow-clip border-0-6 px-3 py-2.5 text-base-lower/6 font-semibold outline-none focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand-surface',
        LOOK[look],
      )}
    >
      <img src={blobPrimary} alt="" aria-hidden className={BLOB_PLACE} />
      <span aria-hidden className="size-5 shrink-0 *:size-full">
        {icon}
      </span>
      {label}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-route-card-primary group-active:shadow-route-card-primary-selected"
      />
    </button>
  );
}

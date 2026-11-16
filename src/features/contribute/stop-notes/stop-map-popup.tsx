import { useEffect, useId, useRef } from 'react';

import type { RecordingTrail } from '@/features/routes/map/recording-trail';
import { useDialogFocus } from '@/shared/hooks/use-dialog-focus';
import { useEscape } from '@/shared/hooks/use-escape';
import { CloseIcon } from '@/shared/ui/route-icons';
import type { LngLat } from '@/shared/utils/geo';

import { CardButton } from './card-button';
import { StopMap } from './stop-map';
import { LocationIcon } from './stop-note-icons';
import { FlagStopIcon } from '../common/flag-stop-icon';
import { DeleteIcon } from '../common/history-icons';

interface StopMapPopupProps {
  trail: RecordingTrail | null;
  at: LngLat | null;
  /** Where the stop is, in words. */
  place: string;
  /** "Stop 2": what the dialog is called for a screen reader. */
  stopName: string;
  /** How many stops the ride has flagged: the chip on the map. */
  count: number;
  /** Close or Escape. */
  onClose: () => void;
  /** Absent, the stop is read only (History): Close alone fills the foot. */
  onDelete?: () => void;
  /** Delete's question stands over it: out of reach, its Escape the question's. */
  isUnderQuestion?: boolean;
}

/**
 * Figma's stop map (4725:29150): a card over the dimmed Stops notes with the stop on its own small
 * map, the flag count on it at the top left and the stop's place at its foot, over Close and the
 * red Delete. Escape and Close close it; Delete asks first (StopNotesScreen).
 */
export function StopMapPopup({
  trail,
  at,
  place,
  stopName,
  count,
  onClose,
  onDelete,
  isUnderQuestion = false,
}: StopMapPopupProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  useDialogFocus(dialogRef, false);
  useEscape(onClose, !isUnderQuestion);
  // Delete's question answered Keep: focus comes back into the card it was asked from.
  const wasUnder = useRef(isUnderQuestion);
  useEffect(() => {
    if (wasUnder.current && !isUnderQuestion) dialogRef.current?.focus();
    wasUnder.current = isUnderQuestion;
  }, [isUnderQuestion]);

  // Tab stays inside the card (a dialog traps focus): without it Tab reaches the page or the save
  // form behind. Idle while the question stands over the card, where it is inert.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || isUnderQuestion) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const stops = [...dialog.querySelectorAll<HTMLElement>('button')];
      const first = stops.at(0);
      const last = stops.at(-1);
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    dialog.addEventListener('keydown', onKeyDown);
    return () => dialog.removeEventListener('keydown', onKeyDown);
  }, [isUnderQuestion]);

  return (
    <div
      inert={isUnderQuestion}
      className="absolute inset-0 z-50 flex items-center bg-surface-transparent px-4 pt-12 pb-4 font-sn-pro"
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="flex w-full flex-col overflow-clip rounded-4xl bg-surface outline-none"
      >
        <h2 id={titleId} className="sr-only">
          {stopName} on the map
        </h2>
        <div className="relative h-103">
          <StopMap trail={trail} at={at} />
          <p className="pointer-events-none absolute top-4 left-4 flex items-center gap-1 rounded-full bg-surface-inverse-secondary px-2 py-1 text-base-lower/6 font-semibold text-content-inverse">
            <span aria-hidden className="size-5 *:size-full">
              <FlagStopIcon />
            </span>
            {count}
            <span className="sr-only">{count === 1 ? 'stop' : 'stops'} flagged</span>
          </p>
          <p className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 px-4 pt-2 pb-3 text-sm/5 text-content-tertiary">
            <span aria-hidden className="size-5 shrink-0 *:size-full">
              <LocationIcon />
            </span>
            <span className="min-w-0 flex-1">{place}</span>
          </p>
        </div>
        <div className="flex">
          <CardButton
            icon={<CloseIcon />}
            label="Close"
            look="plain"
            corner={onDelete ? 'left' : 'both'}
            onClick={onClose}
          />
          {onDelete && (
            <CardButton
              icon={<DeleteIcon />}
              label="Delete"
              look="delete"
              corner="right"
              onClick={onDelete}
            />
          )}
        </div>
      </section>
    </div>
  );
}

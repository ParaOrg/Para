import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/design-system/primitives/button';
import { IconButton } from '@/design-system/primitives/icon-button';
import { TextAreaField } from '@/design-system/primitives/text-area-field';
import { useDialogFocus } from '@/shared/hooks/use-dialog-focus';
import { useEscape } from '@/shared/hooks/use-escape';
import { CloseIcon } from '@/shared/ui/route-icons';

import { NOTE_MAX_LENGTH } from '../recorder/recording-marks';

export interface StopNoteSheetProps {
  /** The flag's note so far: empty for a flag with none. */
  note: string;
  /** Save: the note as typed. */
  onSave: (note: string) => void;
  /** ✕, Escape, or a tap outside the sheet: closes with nothing kept. */
  onClose: () => void;
}

/**
 * A flagged stop's note: a sheet over the screen with one field, "How do you describe this stop",
 * and Save. The recording goes on under it. A stand-in built from the ride sheet's parts until the
 * owner's Figma frame comes.
 *
 * A dialog holding the keyboard: the field has focus as it opens, so the phone's keyboard comes
 * up, and Tab goes round ✕, the field and Save.
 */
export function StopNoteSheet({ note, onSave, onClose }: StopNoteSheetProps) {
  const sheetRef = useRef<HTMLFormElement>(null);
  const ids = useId();
  const [text, setText] = useState(note);
  useDialogFocus(sheetRef, false);
  useEscape(onClose);
  // The page draws again every second while recording: the listener below must not start afresh
  // each time, or a tap landing as it does is taken for the one that opened the sheet.
  const latestClose = useRef(onClose);
  useEffect(() => {
    latestClose.current = onClose;
  });

  // After useDialogFocus has noted where focus was: the field, at the end of what is there.
  useEffect(() => {
    const field = sheetRef.current?.querySelector('textarea');
    if (!field) return;
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  }, []);

  // A tap anywhere but the sheet closes it: on the tap's click, so the same tap presses nothing
  // under it. Not the click that opened it, still on its way up.
  useEffect(() => {
    const listensFrom = performance.now();
    const handleClick = (e: MouseEvent) => {
      if (e.timeStamp < listensFrom) return;
      if (e.target instanceof Node && sheetRef.current?.contains(e.target)) return;
      latestClose.current();
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Tab goes round inside the sheet.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const stops = [...sheet.querySelectorAll<HTMLElement>('button, textarea')];
      const first = stops.at(0);
      const last = stops.at(-1);
      if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet)) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    sheet.addEventListener('keydown', handleKeyDown);
    return () => sheet.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div aria-hidden className="absolute inset-0 z-40 bg-surface-transparent" />
      <form
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${ids}-title`}
        tabIndex={-1}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          onSave(text);
        }}
        className="absolute inset-x-0 bottom-0 z-50 max-h-dvh overflow-y-auto rounded-t-4xl bg-surface font-sn-pro text-content-primary shadow-bottom-sheet-top-shadow outline-none"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 id={`${ids}-title`} className="min-w-0 flex-1 text-lg/7 font-bold">
            Add a note
          </h2>
          <IconButton
            icon={<CloseIcon />}
            label="Close"
            size="small"
            tooltip="top"
            onClick={onClose}
          />
        </div>
        <div className="flex flex-col gap-4 px-5 pt-2 pb-[max(2rem,env(safe-area-inset-bottom))]">
          <TextAreaField
            id={`${ids}-note`}
            label="How do you describe this stop"
            maxLength={NOTE_MAX_LENGTH}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Button variant="primary" type="submit" label="Save" />
        </div>
      </form>
    </>
  );
}

import { useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import type { MarkRow } from '../storage/recording-schema';

export interface FlagNoteSheet {
  isOpen: boolean;
  /** The note of the flag being written, as it stands: empty for none. */
  note: string;
  /** The list of flags: focus goes back to the row that opened the sheet. */
  listRef: RefObject<HTMLUListElement | null>;
  open: (index: number) => void;
  save: (note: string) => void;
  close: () => void;
}

/**
 * The save form's note sheet: which flag it writes on, by its place among the ride's flags. Focus
 * goes back to that flag's row by hand as it closes: the form went inert as the sheet opened, so
 * the row had already lost focus and the sheet has nothing to give back.
 */
export function useFlagNoteSheet(
  marks: readonly MarkRow[],
  onNoteMark: (index: number, note: string) => void,
): FlagNoteSheet {
  const [index, setIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const close = () => {
    const opened = index;
    flushSync(() => setIndex(null));
    if (opened !== null) listRef.current?.querySelectorAll('button')[opened]?.focus();
  };
  return {
    isOpen: index !== null,
    note: (index === null ? undefined : marks.at(index)?.note) ?? '',
    listRef,
    open: setIndex,
    save: (note) => {
      if (index !== null) onNoteMark(index, note);
      close();
    },
    close,
  };
}

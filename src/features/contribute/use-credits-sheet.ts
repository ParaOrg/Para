import { useCallback, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

export interface CreditsSheet {
  isOpen: boolean;
  /** Closed and sliding down: still drawn, the page under it live again. */
  isLeaving: boolean;
  /** Each opening a sheet of its own (its key), so one opened while the last slides down rises afresh. */
  openings: number;
  /** The ⓘ that opens it, on Start, the recording screen or Unfinished: focus goes back to it. */
  buttonRef: RefObject<HTMLButtonElement | null>;
  open: () => void;
  /** ✕, Escape or a tap on the dimmed map: the sheet starts down. A stable reference. */
  close: () => void;
  /** The sheet is down and gone. A stable reference. */
  handleGone: () => void;
}

/**
 * The map's credits, over Start, a recording or one left open. Their own ⓘ opens them; every
 * other screen over the map keeps MapLibre's corner ⓘ.
 */
export function useCreditsSheet(): CreditsSheet {
  const [isOpen, setIsOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [openings, setOpenings] = useState(0);
  // Focus goes back to the ⓘ as the sheet starts down, once Start is live again: the sheet cannot
  // hand it back itself, as the ⓘ turned inert under it the moment it opened.
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    flushSync(() => {
      setIsOpen(false);
      setIsLeaving(true);
    });
    buttonRef.current?.focus();
  }, []);
  const handleGone = useCallback(() => setIsLeaving(false), []);
  const open = () => {
    setIsLeaving(false);
    setOpenings((n) => n + 1);
    setIsOpen(true);
  };
  return { isOpen, isLeaving, openings, buttonRef, open, close, handleGone };
}

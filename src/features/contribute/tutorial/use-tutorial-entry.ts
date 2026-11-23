import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { flushSync } from 'react-dom';

import { TUTORIAL_ENTRY, isTutorialEntry } from './tutorial-entry';
import type { TutorialDemo } from './tutorial-steps';

export interface TutorialEntry {
  isOpen: boolean;
  /** Open, and over Ready: shown. */
  isShown: boolean;
  /** Under the tutorial's later steps, a demo recording in Record's place. */
  demo: TutorialDemo;
  /** The tutorial's own step says which demo shows. A stable reference. */
  changeDemo: (demo: TutorialDemo) => void;
  /** Record's ?, which opens it: focus goes back to it as it closes. */
  helpButtonRef: RefObject<HTMLButtonElement | null>;
  /** The "Track your routes" card, which the ? opens first, shown over Ready. */
  isOfferShown: boolean;
  openOffer: () => void;
  /** Later, Escape or a tap outside: focus goes back to the ?. A stable reference. */
  closeOffer: () => void;
  open: () => void;
  /** Skip, Escape or Got it. A stable reference. */
  close: () => void;
}

/**
 * The tutorial, from Record's ?, opened with a history entry of its own so the phone's Back closes
 * it rather than leaving the page.
 *
 * @param isReadyClear - Ready with no screen of its own over it (page-layout.ts): the tutorial
 *   shows only there. A ride, or the account gate, taking its place ends it, demo and all; so does
 *   a hash move (the browser's Forward onto History, say).
 */
export function useTutorialEntry(isReadyClear: boolean): TutorialEntry {
  const [isOpen, setIsOpen] = useState(false);
  const [demo, setDemo] = useState<TutorialDemo>(null);
  const isShown = isOpen && isReadyClear;
  if (isOpen && !isShown) {
    setIsOpen(false);
    setDemo(null);
  }
  const [isOfferOpen, setIsOfferOpen] = useState(false);
  const isOfferShown = isOfferOpen && isReadyClear;
  if (isOfferOpen && !isOfferShown) setIsOfferOpen(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const closeOffer = useCallback(() => {
    flushSync(() => setIsOfferOpen(false));
    helpButtonRef.current?.focus();
  }, []);
  // Back on Record, focus goes back to the ? that opened it, as a closed sheet hands it back.
  const closeNow = useCallback(() => {
    flushSync(() => {
      setDemo(null);
      setIsOpen(false);
    });
    helpButtonRef.current?.focus();
  }, []);
  const open = () => {
    setIsOfferOpen(false);
    window.history.pushState({ [TUTORIAL_ENTRY]: true }, '');
    setIsOpen(true);
  };
  // Its own Skip, Escape and Got it take its history entry back off.
  const close = useCallback(() => {
    if (isTutorialEntry(window.history.state)) window.history.back();
    else closeNow();
  }, [closeNow]);
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('popstate', closeNow);
    return () => window.removeEventListener('popstate', closeNow);
  }, [isOpen, closeNow]);
  return {
    isOpen,
    isShown,
    demo,
    changeDemo: setDemo,
    helpButtonRef,
    isOfferShown,
    openOffer: () => setIsOfferOpen(true),
    closeOffer,
    open,
    close,
  };
}

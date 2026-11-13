import { useEffect, useRef, useState } from 'react';

import { AddIcon } from './stop-note-icons';

/** How long the pill stays after a flag, its ring running down the while. */
export const STOP_NOTE_PILL_MS = 5000;

export interface StopNotePillProps {
  /** Tapped: the note's card opens for the stop just flagged. */
  onOpen: () => void;
  /** Its time is up. */
  onGone: () => void;
}

/**
 * Figma's Add a stop note pill (4707:9551), over the recording card after a flag: a ring that runs
 * down over STOP_NOTE_PILL_MS round a plus, then "Add a stop note" and a line under it. A tap opens
 * the note's card; left alone it goes. A note missed here is written on Stops notes, so the pill is
 * never the only way. Drawn afresh (a new `key`) for each flag, its time starting again.
 */
export function StopNotePill({ onOpen, onGone }: StopNotePillProps) {
  const ringRef = useRef<SVGCircleElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Its time up while it has focus, it waits for focus to leave: a keyboard on it is not dropped.
  const [isDue, setIsDue] = useState(false);
  const latestGone = useRef(onGone);
  useEffect(() => {
    latestGone.current = onGone;
  });

  // Syncs with the browser's clock and animations: the ring runs down as the time does, still
  // with reduced motion, where it just stands full until the pill goes.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (buttonRef.current?.contains(document.activeElement)) setIsDue(true);
      else latestGone.current();
    }, STOP_NOTE_PILL_MS);
    const isStill = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const running = isStill
      ? null
      : ringRef.current?.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: 100 }], {
          duration: STOP_NOTE_PILL_MS,
          easing: 'linear',
          fill: 'forwards',
        });
    return () => {
      window.clearTimeout(timer);
      running?.cancel();
    };
  }, []);

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onOpen}
      onBlur={() => {
        if (isDue) onGone();
      }}
      className="flex w-full items-start gap-3 rounded-full bg-surface p-2 text-left font-sn-pro shadow-large outline-none focus-visible:ring-2 focus-visible:ring-brand-surface"
    >
      <span aria-hidden className="relative size-11 shrink-0">
        <svg viewBox="0 0 44 44" fill="none" className="size-full -rotate-90">
          <circle cx="22" cy="22" r="18.7" strokeWidth="6.6" className="stroke-brand-ring-track" />
          <circle
            ref={ringRef}
            cx="22"
            cy="22"
            r="18.7"
            strokeWidth="6.6"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray="100"
            className="stroke-brand-surface"
          />
        </svg>
        <span className="absolute inset-2.5 text-content-primary *:size-full">
          <AddIcon />
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base-lower/6 font-bold text-content-primary">Add a stop note</span>
        <span className="text-sm/5 text-content-tertiary">
          Describe what that stop mean for you
        </span>
      </span>
    </button>
  );
}

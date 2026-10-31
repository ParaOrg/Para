import { useEffect, useState } from 'react';

import { IconButton } from '@/design-system/primitives/icon-button';

interface FlagStopButtonProps {
  /** False while paused: the button shows, disabled, as the Paused frame draws it. */
  isRecording: boolean;
  /** False once the ride holds the most stops it can: the button stays, aria-disabled. */
  canFlag: boolean;
  onFlag: () => void;
}

/** How long "Flagged" stays beside the button. */
const FLAGGED_MS = 1500;

/**
 * Figma's Flag a stop (4494:2038): the Special Large IconButton with the `falgstop` icon, at the
 * top of the right-hand column over the map-style and locator buttons. A tap flags the place the
 * contributor is, just the place: no note, no question afterwards. "Flagged" shows beside it for
 * a moment (a screen reader hears it from the page's status line).
 */
export function FlagStopButton({ isRecording, canFlag, onFlag }: FlagStopButtonProps) {
  const [flaggedTaps, setFlaggedTaps] = useState(0);
  const isFlaggedShown = flaggedTaps > 0;

  // Each tap restarts the moment, so "Flagged" is on screen for FLAGGED_MS after the last one.
  useEffect(() => {
    if (flaggedTaps === 0) return;
    const timer = window.setTimeout(() => setFlaggedTaps(0), FLAGGED_MS);
    return () => window.clearTimeout(timer);
  }, [flaggedTaps]);

  const handleClick = () => {
    // aria-disabled, not disabled: focus stays on the button on the tap that fills the ride.
    if (!canFlag) return;
    onFlag();
    setFlaggedTaps((taps) => taps + 1);
  };

  return (
    // 16 over the map-style button, as Figma has it: 4 of them the column's own gap.
    <div className="relative mb-3">
      {isFlaggedShown && (
        // No Figma design for this note yet, so it keeps the locator note's look.
        <p
          data-testid="flagged-note"
          className="pointer-events-none absolute top-1/2 right-full mr-2 -translate-y-1/2 rounded-lg bg-neutral-900/90 px-3 py-2 text-xs text-content-inverse shadow backdrop-blur"
        >
          Flagged
        </p>
      )}
      <IconButton
        size="large"
        tooltip="left"
        label="Flag a stop"
        icon={<FlagStopIcon />}
        disabled={!isRecording}
        aria-disabled={!canFlag || undefined}
        onClick={handleClick}
      />
    </div>
  );
}

/** The Icon Set's `falgstop` (Figma's spelling), on its 28 px grid. */
function FlagStopIcon() {
  return (
    <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden>
      <path d="M11.5223 23.625V13.125H18.5285C19.0972 13.125 19.5733 13.125 19.9373 13.1034C20.2967 13.0821 20.6911 13.0357 21.0276 12.8652C22.0451 12.3495 22.5573 11.1807 22.2022 10.0842C22.0847 9.72113 21.8323 9.41171 21.5938 9.14991C21.3463 8.87809 21.0071 8.54842 20.5944 8.14734L20.5639 8.11768C20.3959 7.9544 20.2954 7.8565 20.2244 7.7793C20.1862 7.73787 20.1685 7.71462 20.1617 7.70525C20.1217 7.62783 20.1217 7.53885 20.1617 7.46143C20.1685 7.45208 20.1862 7.42887 20.2244 7.38738C20.2954 7.31018 20.3959 7.21229 20.5639 7.049L20.5919 7.02177C21.0053 6.62002 21.346 6.28892 21.5938 6.01677C21.8323 5.75497 22.0847 5.44555 22.2022 5.08253C22.5573 3.98595 22.0451 2.81714 21.0276 2.30144C20.6911 2.13092 20.2967 2.08464 19.9373 2.06332C19.5709 2.04161 19.1 2.04163 18.5265 2.04167L11.5223 2.04168L10.0639 2.04167C9.58068 2.04167 9.18892 2.43342 9.18892 2.91667V23.625V24.7918C9.18898 25.4305 9.70235 25.9495 10.339 25.9583H10.3722C11.0088 25.9495 11.5222 25.4305 11.5223 24.7918V23.625Z" />
    </svg>
  );
}
